import styles from "./Divider.module.css";

interface DividerProps {
  vertical?: boolean;
}

export default function Divider({
  vertical = false,
}: DividerProps) {
  return (
    <div
      className={
        vertical
          ? styles.vertical
          : styles.horizontal
      }
    />
  );
}