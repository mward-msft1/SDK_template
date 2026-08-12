package main

type TurnContext struct {
	TurnID    string
	UserID    string
	InputText string
	AuthorizationHeader string
}

type ModelResult struct {
	Blocked    bool   `json:"blocked"`
	Reason     string `json:"reason"`
	OutputText string `json:"outputText"`
}

type Decision struct {
	Block bool
	Raw   string
}
