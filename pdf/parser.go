package pdf

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"talents/db"
	"talents/llm"
	"time"

	"github.com/ledongthuc/pdf"
)

// ExtractText extracts text content from a PDF file
func ExtractText(pdfBytes []byte) (string, error) {
	// Create a reader from the PDF bytes
	reader := bytes.NewReader(pdfBytes)

	// Parse the PDF
	pdfReader, err := pdf.NewReader(reader, int64(len(pdfBytes)))
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	b, err := pdfReader.GetPlainText()
	if err != nil {
		return "", err
	}

	_, err = buf.ReadFrom(b)
	if err != nil {
		return "", err
	}

	// Convert the extracted text to lowercase
	return strings.ToLower(buf.String()), nil
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
4. 学历只返回最高的
5. 技能样例：Java、Python、C、大模型应用、大模型微调
6. 返回的手机号为数字，不要返回字符串
7. 输出时不要返回 markdown 标识
8. 应聘岗位指简历中明确提到的求职意向岗位，如果没有明确提到，请根据简历内容推断最可能的岗位，应聘岗位只能是：前端、后端、运维、嵌入式、算法
</instructions>

<output_format>
{"name":"xx","age":1,"phone":13323313233,"email":"11@qq.com","education":"xx","universities":["xx","xx"],"major":"xx","skills":["x1","x2"],"years":1,"native":"xx","expectCities":["xx","xx"],"expectSalary":10000,"companies":["xx","xx"],"blog":"xx","github":"xx","jobPosition":"xx"}
</output_format>
</optimized_prompt>`

// GenerateTalentFromPDF parses a PDF resume and extracts relevant information to create a Talent
func GenerateTalentFromPDF(pdfBytes []byte) (*db.Talent, error) {
	if len(pdfBytes) == 0 {
		return nil, errors.New("empty PDF file")
	}

	// Extract text from PDF
	text, err := ExtractText(pdfBytes)
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
