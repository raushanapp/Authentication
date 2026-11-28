export function checkUsername(username: string): string[] {
  const errors: string[] = [];
  if (!/\s+@\s+\.\s+/.test(username))
    errors.push("Username must not contain an email format");

  //   more rules here
  // @name
  // name-thing
  // name_thing

  return errors;
}
