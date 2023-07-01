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

  const index = await client.Index("your-pinecone-index-name");
  const queryRequest = {
    topK: 10,
    vector: queryEmbedding,
    includeMetadata: true,
    includeValues: true,
  };
  let queryResponse = await index.query({ queryRequest });

  queryResponse.matches.forEach((match) => {
    console.log(match.score);
  });

  const relevantMatches = queryResponse.matches.filter(
    (match) => match.score > 0.8
  );

  if (relevantMatches.length === 0) {
    // const messages = [
    //   {
    //     role: "system",
    //     content:
    //       "Determine if the user's input is relevant to AI. If yes return 'Yes.' If no return 'No.' Do not include anything else in the response.",
    //   },
    //   ...context.slice(-1),
    // ];

    // try {
    //   const completion = await openai.createChatCompletion({
    //     model: "gpt-3.5-turbo",
    //     messages,
    //   });

    //   const response = completion.data.choices[0].message.content;
    //   console.log(response);
    //   const promptIsRelevant = response.includes("Yes");

    //   if (!promptIsRelevant) {
    //     return "Sorry, I am only trained to answer questions about the contents of AI Explained. Do you have any questions about that?";
    //   }
    //   return "Nice job! Super relevant!";
    // } catch (error) {
    //   console.error(`Error 2`);
    //   return "Error 2";
    // }

    return "Sorry, I am only trained to answer questions about the contents of AI Explained. Do you have any questions about that?";
  }

  const pineconeContext = relevantMatches
    .map((match) => match.metadata.pageContent)
    .join(" ");

  const messages = [
    {
      role: "system",
      content: pineconeContext,
    },
    ...context.slice(-5),
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });

    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error(`Error 3`);
    return "Error 3";
  }
}
