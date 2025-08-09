const fetch = require("node-fetch");

// 檢查預測狀態的函數
async function checkPredictionStatus(predictionId) {
    try {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                "Authorization": "Token " + process.env.REPLICATE_API_TOKEN
            }
        });
        
        const prediction = await response.json();
        
        if (prediction.status === "succeeded") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "succeeded",
                    result: prediction.output
                })
            };
        } else if (prediction.status === "failed") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "failed",
                    error: prediction.error || "處理失敗"
                })
            };
        } else {
            // 仍在處理中
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: prediction.status
                })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}

exports.handler = async function(event) {
    try {
        // 檢查是否為輪詢請求
        if (event.httpMethod === "GET" && event.queryStringParameters && event.queryStringParameters.id) {
            const predictionId = event.queryStringParameters.id;
            return await checkPredictionStatus(predictionId);
        }
        
        // 處理初始圖片上傳請求
        const body = JSON.parse(event.body);
        let imageBase64 = body.image;
        
        // 檢查是否為 data URL 格式，如果是則提取純 base64 部分
        if (imageBase64 && imageBase64.startsWith('data:')) {
            // 提取 base64 部分（去除 data:image/jpeg;base64, 等前綴）
            imageBase64 = imageBase64.split(',')[1];
        }

        // 調用 Replicate API
        // 檢查 API 令牌是否已設置
        if (!process.env.REPLICATE_API_TOKEN) {
            console.error("未設置 REPLICATE_API_TOKEN 環境變量");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "伺服器配置錯誤：未設置 API 令牌" })
            };
        }
        
        try {
            const requestBody = {
                version: "yorickvp/llava-13b:2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591",
                input: {
                    image: imageBase64,
                    prompt: "請以中醫舌診角度，分析此舌頭的健康狀況，並提供具體調理建議。"
                }
            };
            
            const res = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Authorization": "Token " + process.env.REPLICATE_API_TOKEN,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error("Replicate API 錯誤:", errorText);
                return {
                    statusCode: res.status,
                    body: JSON.stringify({ error: `API 錯誤: ${errorText}` })
                };
            }
            
            const result = await res.json();
            
            // 檢查是否需要輪詢結果
            if (result.status === "starting" || result.status === "processing") {
                // 返回處理中狀態，前端可以顯示等待信息
                return {
                    statusCode: 202,
                    body: JSON.stringify({ 
                        status: result.status, 
                        id: result.id,
                        message: "模型正在處理中，請稍候..."
                    })
                };
            }
            
            return {
                statusCode: 200,
                body: JSON.stringify({ result: result.output || "分析失敗" })
            };
        } catch (apiError) {
            console.error("API 調用錯誤:", apiError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `API 調用錯誤: ${apiError.message}` })
            };
        }
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
