// Utility functions for reading input from stdin with default values

export async function prompt(question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    const displayQuestion = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;

    stdout.write(displayQuestion);

    stdin.setRawMode(false);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";

    const onData = (data: string) => {
      if (data === "\n" || data === "\r\n" || data === "\r") {
        stdin.removeListener("data", onData);
        stdin.pause();
        const result = input.trim() || defaultValue || "";
        stdout.write("\n");
        resolve(result);
      } else if (data === "\u0003") {
        // Ctrl+C
        stdin.removeListener("data", onData);
        stdin.pause();
        stdout.write("\n");
        process.exit(0);
      } else if (data === "\u007f" || data === "\b") {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          stdout.write("\b \b");
        }
      } else {
        input += data;
        stdout.write(data);
      }
    };

    stdin.on("data", onData);
  });
}

export async function promptNumber(question: string, defaultValue?: number): Promise<number> {
  while (true) {
    const input = await prompt(question, defaultValue?.toString());
    const parsed = parseFloat(input);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
    console.log("Please enter a valid number.");
  }
}

export async function promptInteger(question: string, defaultValue?: number): Promise<number> {
  while (true) {
    const input = await prompt(question, defaultValue?.toString());
    const parsed = parseInt(input, 10);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
    console.log("Please enter a valid integer.");
  }
}

export function parseCommaSeparated(input: string): string[] {
  return input
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}
