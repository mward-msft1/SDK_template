package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

func main() {
	config, err := loadConfig()
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	agent365 := newAgent365Adapter(config)
	purview := newPurviewAdapter(config)

	var result ModelResult
	if strings.EqualFold(config.HostSDK, "m365-agents-sdk") {
		result, err = runWithM365AgentsSDK(purview, agent365, config)
	} else {
		result, err = runWithAgentFramework(purview, agent365, config)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	out, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
	fmt.Println(string(out))
}
