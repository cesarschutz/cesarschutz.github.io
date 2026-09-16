import quotes from "../data/quotes.json";

export interface Quote {
  text: string;
  author: string;
  context: string;
  url: string;
}

export const QUOTES: Quote[] = quotes;

/**
 * Autores cujas frases combinam com cada categoria — usado para escolher a
 * frase do fim de cada post. Categoria sem lista usa todas as frases.
 */
const AUTHORS_BY_CATEGORY: Record<string, string[]> = {
  Arquitetura: [
    "Martin Fowler", "Gregor Hohpe", "Sam Newman", "Martin Kleppmann", "Pat Helland",
    "Michael Nygard", "Werner Vogels", "Fred Brooks", "Neal Ford", "Mark Richards",
    "Eric Evans", "Vaughn Vernon", "Chris Richardson", "Melvin Conway", "Leslie Lamport",
    "Simon Brown", "Greg Young", "Roy Fielding", "Tyler Treat", "Jay Kreps", "Rich Hickey",
  ],
  Java: [
    "Brian Goetz", "Joshua Bloch", "Josh Long", "Kent Beck", "Robert C. Martin",
    "Sandi Metz", "Michael Feathers", "Tony Hoare", "Edsger Dijkstra", "Donald Knuth",
    "Erich Gamma", "Ward Cunningham", "Hans Dockter", "Jason van Zyl", "Joe Armstrong",
  ],
  Observabilidade: [
    "Charity Majors", "Cindy Sridharan", "Liz Fong-Jones", "Benjamin Treynor Sloss",
    "Nora Jones", "Bernd Greifeneder", "Adrian Cockcroft",
  ],
  DevOps: [
    "Jez Humble", "Nicole Forsgren", "Kelsey Hightower", "David Farley", "Kief Morris",
    "Solomon Hykes", "Bret Fisher", "Matthew Skelton & Manuel Pais", "Adam Wiggins",
    "Corey Quinn",
  ],
  Segurança: [
    "Bruce Schneier", "Troy Hunt", "Jim Manico", "John Kindervag", "Kelly Shortridge",
    "Nat Sakimura", "Kim Zetter",
  ],
  Dados: [
    "Martin Kleppmann", "Matei Zaharia", "Jay Kreps", "Rick Houlihan", "Simon Riggs",
    "Monty Widenius", "Eliot Horowitz", "Pat Helland",
  ],
};

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

/** Frase estável para um post: mesma frase a cada build, escolhida pela categoria. */
export function quoteForPost(slug: string, category?: string): Quote {
  const authors = category ? AUTHORS_BY_CATEGORY[category] : undefined;
  const pool = authors ? QUOTES.filter((q) => authors.includes(q.author)) : [];
  const list = pool.length > 0 ? pool : QUOTES;
  return list[hash(slug) % list.length];
}
