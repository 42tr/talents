package llm

import (
	"context"

	"github.com/sashabaranov/go-openai"
)

var cli *openai.Client

func init() {

	// 1. 创建自定义配置
	config := openai.DefaultConfig("your-api-key")
	config.BaseURL = "http://222.190.139.186:1025/v1"

	// 2. 使用配置创建客户端
	cli = openai.NewClientWithConfig(config)
}

func Chat(query string) (string, error) {
	// 3. 正常调用API（会自动指向你的自定义URL）
	resp, err := cli.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "Qwen2.5-14B-Instruct",
			Messages: []openai.ChatCompletionMessage{
				{Role: "user", Content: query},
			},
		},
	)
	if err != nil {
		return "", err
	}
	return resp.Choices[0].Message.Content, nil
}
