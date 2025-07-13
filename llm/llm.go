package llm

import (
	"context"
	"os"

	"github.com/sashabaranov/go-openai"
)

func Chat(query string) (string, error) {
	// 1. 创建自定义配置
	config := openai.DefaultConfig(os.Getenv("LLM_KEY"))
	config.BaseURL = os.Getenv("LLM_URL")

	// 2. 使用配置创建客户端
	cli := openai.NewClientWithConfig(config)
	// 3. 正常调用API（会自动指向你的自定义URL）
	resp, err := cli.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "deepseek-chat",
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
