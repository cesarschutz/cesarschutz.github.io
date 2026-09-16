import quotes from "../data/quotes.json";

export interface Quote {
  text: string;
  author: string;
  context: string;
  url: string;
}

export const QUOTES: Quote[] = quotes;
