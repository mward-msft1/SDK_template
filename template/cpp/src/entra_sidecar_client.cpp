#include "entra_sidecar_client.h"

#include <curl/curl.h>

#include <cctype>
#include <stdexcept>

namespace {
size_t writeBody(void* contents, size_t size, size_t count, void* output) {
  const size_t bytes = size * count;
  static_cast<std::string*>(output)->append(static_cast<char*>(contents), bytes);
  return bytes;
}

std::string jsonStringValue(const std::string& json, const std::string& key) {
  const std::string marker = "\"" + key + "\"";
  const size_t keyPosition = json.find(marker);
  if (keyPosition == std::string::npos) {
    throw std::runtime_error("The Entra sidecar response did not include " + key + ".");
  }
  const size_t colon = json.find(':', keyPosition + marker.size());
  const size_t openingQuote = json.find('"', colon + 1);
  if (colon == std::string::npos || openingQuote == std::string::npos) {
    throw std::runtime_error("The Entra sidecar returned invalid JSON.");
  }

  std::string value;
  bool escaped = false;
  for (size_t index = openingQuote + 1; index < json.size(); ++index) {
    const char current = json[index];
    if (escaped) {
      value.push_back(current);
      escaped = false;
    } else if (current == '\\') {
      escaped = true;
    } else if (current == '"') {
      return value;
    } else {
      value.push_back(current);
    }
  }
  throw std::runtime_error("The Entra sidecar returned invalid JSON.");
}
}  // namespace

EntraSidecarClient::EntraSidecarClient(const AppConfig& config) : config_(config) {}

std::string EntraSidecarClient::getAuthorizationHeader(
    const std::string& incomingAuthorizationHeader) const {
  const bool autonomous = config_.entraSidecarAuthMode == "autonomous";
  const bool obo = config_.entraSidecarAuthMode == "obo";
  if (!autonomous && !obo) {
    throw std::runtime_error("ENTRA_SIDECAR_AUTH_MODE must be autonomous or obo.");
  }
  if (obo && incomingAuthorizationHeader.empty()) {
    throw std::runtime_error(
        "The current request authorization header is required in obo mode.");
  }

  CURL* curl = curl_easy_init();
  if (curl == nullptr) {
    throw std::runtime_error("Unable to initialize libcurl.");
  }

  char* escapedService =
      curl_easy_escape(curl, config_.entraSidecarServiceName.c_str(), 0);
  char* escapedAgent =
      curl_easy_escape(curl, config_.entraAgentClientId.c_str(), 0);
  if (escapedService == nullptr || escapedAgent == nullptr) {
    if (escapedService != nullptr) curl_free(escapedService);
    if (escapedAgent != nullptr) curl_free(escapedAgent);
    curl_easy_cleanup(curl);
    throw std::runtime_error("Unable to encode Entra sidecar request.");
  }

  const std::string endpoint =
      autonomous ? "AuthorizationHeaderUnauthenticated" : "AuthorizationHeader";
  const std::string url = config_.entraSidecarUrl + "/" + endpoint + "/" +
                          escapedService + "?AgentIdentity=" + escapedAgent +
                          "&optionsOverride.RequestAppToken=" +
                          (autonomous ? "true" : "false");
  curl_free(escapedService);
  curl_free(escapedAgent);

  std::string responseBody;
  curl_slist* headers = nullptr;
  if (obo) {
    const std::string incoming =
        "Authorization: " +
        normalizeAuthorizationHeader(incomingAuthorizationHeader);
    headers = curl_slist_append(headers, incoming.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  }
  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeBody);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBody);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

  const CURLcode result = curl_easy_perform(curl);
  long status = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
  if (headers != nullptr) curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  if (result != CURLE_OK) {
    throw std::runtime_error(
        std::string("Entra sidecar token request failed: ") +
        curl_easy_strerror(result));
  }
  if (status < 200 || status >= 300) {
    throw std::runtime_error(
        "Entra sidecar token request failed: " + std::to_string(status) +
        (responseBody.empty() ? "" : " - " + responseBody));
  }
  return normalizeAuthorizationHeader(
      jsonStringValue(responseBody, "authorizationHeader"));
}

std::string normalizeAuthorizationHeader(const std::string& value) {
  const size_t start = value.find_first_not_of(" \t\r\n");
  const size_t end = value.find_last_not_of(" \t\r\n");
  if (start == std::string::npos) {
    throw std::runtime_error("The authorization header is empty.");
  }
  const std::string header = value.substr(start, end - start + 1);
  if (header.rfind("Bearer ", 0) == 0 || header.rfind("PoP ", 0) == 0) {
    return header;
  }
  return "Bearer " + header;
}
