export type WithId<T extends Record<string, unknown>, ID = number> = T & {
  id: ID;
};
