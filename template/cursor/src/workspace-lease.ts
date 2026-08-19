import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface WorkspaceLease {
  path: string;
  dispose(): Promise<void>;
}

export async function createWorkspaceLease(
  sourcePath: string,
  isolate: boolean
): Promise<WorkspaceLease> {
  if (!isolate) {
    return { path: sourcePath, dispose: async () => undefined };
  }

  const { stdout } = await execFileAsync("git", [
    "-C",
    sourcePath,
    "rev-parse",
    "--show-toplevel"
  ]);
  const repositoryRoot = stdout.trim();
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "cursor-governed-"));
  const worktreePath = path.join(temporaryRoot, "workspace");

  try {
    await execFileAsync("git", [
      "-C",
      repositoryRoot,
      "worktree",
      "add",
      "--detach",
      worktreePath,
      "HEAD"
    ]);
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }

  let disposal: Promise<void> | undefined;
  return {
    path: worktreePath,
    async dispose(): Promise<void> {
      disposal ??= (async () => {
        try {
          await execFileAsync("git", [
            "-C",
            repositoryRoot,
            "worktree",
            "remove",
            "--force",
            worktreePath
          ]);
        } finally {
          await rm(temporaryRoot, { recursive: true, force: true });
        }
      })();
      await disposal;
    }
  };
}
