package llm

import (
	"context"
	"talents/config"

	"github.com/sashabaranov/go-openai"
)

func Chat(query string) (string, error) {
	// 1. 创建自定义配置
	cfg := openai.DefaultConfig(config.LLM_KEY)
	cfg.BaseURL = config.LLM_URL

	// 2. 使用配置创建客户端
	cli := openai.NewClientWithConfig(cfg)
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
