import { generateText } from "ai";

async function main() {
  const { text } = await generateText({
    model: "openai/gpt-5.5",
    prompt:
      "Invent a brand-new holiday that does not exist yet. Give it a name, " +
      "the date it falls on, and describe its traditions in a few sentences.",
  });
  console.log(text);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
