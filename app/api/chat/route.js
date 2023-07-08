import { Configuration, OpenAIApi } from "openai";
import { PineconeClient } from "@pinecone-database/pinecone";

let openai;
let client;

(async () => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  openai = new OpenAIApi(configuration);

  client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
})();

export async function POST(request) {
  const data = await request.json();
  const { context } = data;

  try {
    const assistantResponse = await handleInput(context);
    return Response.json({
      message: assistantResponse,
    });
  } catch (error) {
    console.error(error);
    return Response.json({
      message: "Error 1",
    });
  }
}

async function handleInput(context) {
  const lastUserMessage = context[context.length - 1].content;
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: lastUserMessage,
  });
  const queryEmbedding = response.data.data[0].embedding;

  const index = await client.Index("ai-explained-transcripts");
  const queryRequest = {
    topK: 10,
    vector: queryEmbedding,
    includeMetadata: true,
    includeValues: true,
  };
  let queryResponse = await index.query({ queryRequest });

  const relevantMatches = queryResponse.matches.filter(
    (match) => match.score > 0.7
  );

  if (relevantMatches.length === 0) {
    console.log("No relevant matches found.");
    const messages = [
      {
        role: "system",
        content: `You are Matt D'Avella, a documentary filmmaker, entrepreneur and YouTuber. You also teach courses on everything from filmmaking to habit change. You like to nerd out about self-development.`,
      },
      ...context.slice(-3),
    ];

    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
      });

      const response = completion.data.choices[0].message.content;
      return response;
    } catch (error) {
      console.error(error);
      return "Error 2";
    }
  }

  const pineconeContext = relevantMatches
    .map((match) => match.metadata.pageContent)
    .join(" ");

  const messages = [
    {
      role: "system",
      content: `You are Matt D'Avella, a documentary filmmaker, entrepreneur and YouTuber. You also teach courses on everything from filmmaking to habit change. You like to nerd out about self-development. Use the following context to answer the user's question. Do not add anything just rearrange the most relevant information. Context: ${pineconeContext}`,
    },
    ...context.slice(-1),
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });

    const response = completion.data.choices[0].message.content;
    return response;
  } catch (error) {
    console.error(error);
    return "Error 3";
  }
}
