package pdf

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"talents/db"
	"talents/llm"
	"time"
)

func extractByTika(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// 构建 multipart/form-data 请求体
	body := &bytes.Buffer{}
	writer := io.MultiWriter(body)

	_, err = io.Copy(writer, file)
	if err != nil {
		return "", err
	}

	// 设置请求头
	req, err := http.NewRequest("PUT", os.Getenv("TIKA_URL"), body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/pdf") // 可以根据文件类型设置
	req.Header.Set("Accept", "text/plain")
	// 发送请求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// 读取响应（提取出的纯文本）
	extractedText, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	fmt.Println("Extracted Text:")
	fmt.Println(string(extractedText))
	return file.Name() + "\n" + string(extractedText), nil

}

// ExtractText extracts text content from a PDF file
func ExtractText(path string) (string, error) {
	// f, r, err := pdf.Open(path)
	// if err != nil {
	// 	return "", err
	// }
	// defer f.Close()

	// totalPage := r.NumPage()
	// text := ""
	// for pageIndex := 1; pageIndex <= totalPage; pageIndex++ {
	// 	page := r.Page(pageIndex)
	// 	if page.V.IsNull() {
	// 		continue
	// 	}
	// 	content, err := page.GetPlainText(nil)
	// 	if err != nil {
	// 		fmt.Printf("读取第 %d 页失败: %v\n", pageIndex, err)
	// 		continue
	// 	}
	// 	fmt.Printf("第 %d 页内容：\n%s\n", pageIndex, content)
	// 	text += content
	// }
	// // Check if the text contains Chinese characters
	// containsChinese := false
	// for _, r := range text {
	// 	if r >= '\u4e00' && r <= '\u9fff' {
	// 		containsChinese = true
	// 		break
	// 	}
	// }

	// If no Chinese characters are found, try extracting with Tika
	// if containsChinese {
	fmt.Println("No Chinese characters found, trying Tika extraction...")
	tikaText, err := extractByTika(path)
	if err != nil {
		fmt.Printf("Tika extraction failed: %v\n", err)
		return "", err
	}
	// }
	return tikaText, nil
}

const PROMPT = `<optimized_prompt>
<task>从用户输入获取指定信息</task>

<context>
当前时间：%s
根据以下从pdf读取的简历信息，获取应聘者信息。
%s
</context>

<instructions>
1. 分析用户输入，提取关键信息
2. 获取应聘者姓名、年龄、手机号、邮箱、学历、上过的大学列表、专业、技能、工作年限、籍贯、意向城市列表、期望薪资、工作过的公司列表、博客地址、Github地址、应聘岗位
3. 仅返回指定内容，不要返回多余内容
4. 学历只返回最高的，选项：本科、硕士、博士
5. 技能包括但不限于：java、python、c、大模型应用、大模型微调，英文全部用小写
6. 返回的手机号为数字，不要返回字符串
7. 输出时不要返回 markdown 标识
8. 应聘岗位指简历中明确提到的求职意向岗位，如果没有明确提到，请根据简历内容推断最可能的岗位，应聘岗位只能是：前端、后端、运维、嵌入式、算法
9. 手机号为 11 位
</instructions>

<output_format>
{"name":"xx","age":1,"phone":13323313233,"email":"11@qq.com","education":"xx","universities":["xx","xx"],"major":"xx","skills":["x1","x2"],"years":1,"native":"xx","expectCities":["xx","xx"],"expectSalary":10000,"companies":["xx","xx"],"blog":"xx","github":"xx","jobPosition":"xx"}
</output_format>
</optimized_prompt>`

// GenerateTalentFromPDF parses a PDF resume and extracts relevant information to create a Talent
func GenerateTalentFromPDF(path string) (*db.Talent, error) {

	// Extract text from PDF
	text, err := ExtractText(path)
	if err != nil {
		return nil, err
	}
	fmt.Println(text)

	query := fmt.Sprintf(PROMPT, time.Now().Format("2006-01-02"), text)
	resp, err := llm.Chat(query)
	if err != nil {
		return nil, err
	}
	fmt.Println(resp)

	// Parse the extracted text to create a Talent
	talent := &db.Talent{}

	resp = strings.ReplaceAll(resp, "```json", "")
	resp = strings.ReplaceAll(resp, "```", "")

	err = json.Unmarshal([]byte(resp), &talent)
	if err != nil {
		return nil, err
	}

	talent.CalcScore()

	return talent, nil
}
