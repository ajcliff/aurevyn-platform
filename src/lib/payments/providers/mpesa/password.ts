import { getTimestamp } from "./timestamp";

export function generatePassword(
  shortcode: string,
  passkey: string
) {
  const timestamp = getTimestamp();

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString("base64");

  return {
    password,
    timestamp,
  };
}