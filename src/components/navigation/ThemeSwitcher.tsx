"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { FC } from "react";

const ThemeSwitcher: FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center gap-2"
    >
      {theme === "light" ? (
        <span>
          {" "}
          <Moon className="h-4 w-4" />
        </span>
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
};

export default ThemeSwitcher;
