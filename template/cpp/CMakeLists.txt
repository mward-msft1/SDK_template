cmake_minimum_required(VERSION 3.16)
project(m365_agnostic_agent_template_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(
  example_runner
  src/example_runner.cpp
  src/config.cpp
  src/agent365_adapter.cpp
  src/purview_adapter.cpp
  src/agent_middleware_template.cpp
  src/host_adapters.cpp
)

target_include_directories(example_runner PRIVATE src)
