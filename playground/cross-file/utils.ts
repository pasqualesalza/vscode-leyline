import type { User, UserFilter } from "./types";

export function filterUsers(users: User[], predicate: UserFilter): User[] {
  return users.filter(predicate);
}

export function getActiveUsers(users: User[]): User[] {
  return filterUsers(users, (u) => u.active);
}

export function getUsersByRole(users: User[], role: User["role"]): User[] {
  return filterUsers(users, (u) => u.role === role);
}

export function formatUserName(user: User): string {
  return `${user.name} <${user.email}>`;
}
