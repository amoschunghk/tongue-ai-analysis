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
        const imageBase64 = body.image;

        // 調用 Replicate API
        const res = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": "Token " + process.env.REPLICATE_API_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: "meta/llama-3-8b-instruct:dd2c4223c00e1c9f4bff8a8c687a8a24b30c0fe15e3de20f3b704b8519ef9e79",
                input: {
                    image: imageBase64,
                    prompt: "請以中醫舌診角度，分析此舌頭的健康狀況，並提供具體調理建議。"
                }
            })
        });
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
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
