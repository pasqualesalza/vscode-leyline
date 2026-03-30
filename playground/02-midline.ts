interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

function getActiveUsers(users: User[]): User[] {
  return users.;
}

function formatUser(user: User): string {
  return `${user.name} <${user.email}>`;
}

const allUsers: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", active: true },
  { id: 2, name: "Bob", email: "bob@example.com", active: false },
];

console.log(getActiveUsers(allUsers).map(formatUser));
