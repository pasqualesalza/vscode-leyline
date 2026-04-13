export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role: "admin" | "editor" | "viewer";
}

export interface Project {
  id: number;
  name: string;
  ownerId: number;
  members: number[];
  createdAt: Date;
}

export type UserFilter = (user: User) => boolean;
