import type { Project, User } from "./types";
import { formatUserName, getActiveUsers, getUsersByRole } from "./utils";

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", active: true, role: "admin" },
  { id: 2, name: "Bob", email: "bob@example.com", active: false, role: "editor" },
  { id: 3, name: "Charlie", email: "charlie@example.com", active: true, role: "viewer" },
];

const projects: Project[] = [
  { id: 1, name: "Leyline", ownerId: 1, members: [1, 2, 3], createdAt: new Date() },
];

function getProjectMembers(project: Project): string[] {

}
