/**
 * Série "Atualizações do Java": só versões LTS. Cada post (java-NN.md) reúne
 * o que as versões intermediárias trouxeram desde a LTS anterior.
 * Nova LTS lançada: mover de `upcoming` para `released` e criar o post da próxima.
 */
export interface JavaLts {
  version: number;
  /** mês/ano de lançamento (ou previsto) */
  release: string;
  /** versões cujo conteúdo o post reúne */
  covers: string;
  upcoming?: boolean;
}

export const JAVA_LTS: JavaLts[] = [
  { version: 29, release: "set/2027", covers: "Java 26 e 27 já lançados", upcoming: true },
  { version: 25, release: "set/2025", covers: "Java 22, 23, 24 e 25" },
  { version: 21, release: "set/2023", covers: "Java 18, 19, 20 e 21" },
  { version: 17, release: "set/2021", covers: "Java 12 a 17" },
  { version: 11, release: "set/2018", covers: "Java 9, 10 e 11" },
  { version: 8, release: "mar/2014", covers: "Mudanças desde o Java 7" },
];

/** LTS já lançadas */
export const RELEASED_LTS = JAVA_LTS.filter((v) => !v.upcoming);

/**
 * Versões que não são LTS e foram absorvidas por uma LTS: os posts antigos
 * (/posts/java-NN/) redirecionam para a seção da versão dentro do post da LTS.
 */
export const ABSORBED: Record<number, number> = {
  9: 11, 10: 11,
  12: 17, 13: 17, 14: 17, 15: 17, 16: 17,
  18: 21, 19: 21, 20: 21,
  22: 25, 23: 25, 24: 25,
  26: 29,
};
