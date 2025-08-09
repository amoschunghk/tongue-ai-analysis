const fetch = require("node-fetch");

exports.handler = async function(event) {
    try {
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
                version: "你的模型版本ID",
                input: {
                    image: imageBase64,
                    prompt: "請以中醫舌診角度，分析此舌頭的健康狀況，並提供具體調理建議。"
                }
            })
        });
        const result = await res.json();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: result.output || "分析失敗" })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
