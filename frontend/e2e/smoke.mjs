// Run against an already running Compose stack; cleans up its own project.
import { chromium, request } from "playwright";
import assert from "node:assert/strict";

const frontend = process.env.E2E_FRONTEND_URL || "http://localhost:8080";
const api = process.env.E2E_API_URL || "http://localhost:8000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const http = await request.newContext({ baseURL: api });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const name = `Browser smoke ${Date.now()}`;
let projectId;
try {
  await page.goto(frontend);
  await page
    .getByRole("heading", { name: "A little clarity. A lot of progress." })
    .waitFor();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: /Projects/ })
    .click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill(name);
  await page
    .getByLabel("Description")
    .fill("Created by automated browser validation.");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const response = await http.get("/api/projects");
  projectId = (await response.json()).find((p) => p.name === name)?.id;
  assert.ok(projectId, "Project was persisted through the API");
  await page.getByRole("link", { name, exact: false }).first().click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Ship browser-tested TaskFlow");
  await page.getByLabel("Priority", { exact: true }).selectOption("high");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByLabel("Status of Ship browser-tested TaskFlow")
    .selectOption("in_progress");
  await page.getByText("Moved to In Progress", { exact: true }).waitFor();
  await page
    .getByLabel("Status of Ship browser-tested TaskFlow")
    .selectOption("done");
  await page.getByText("Moved to Done", { exact: true }).waitFor();
  const tasks = await (
    await http.get(`/api/tasks?project_id=${projectId}`)
  ).json();
  assert.equal(tasks[0].status, "done");
  await page
    .getByLabel("Edit Ship browser-tested TaskFlow", { exact: true })
    .click();
  await page.getByLabel("Task title").fill("TaskFlow is ready");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByLabel("Search tasks").fill("no matching result");
  await page.getByText("No matching tasks").first().waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "TaskFlow is ready", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Search tasks").fill("");
  await page
    .getByRole("button", { name: "TaskFlow is ready", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "TaskFlow is ready", exact: true })
    .waitFor();
  await page.getByLabel("Delete TaskFlow is ready", { exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "TaskFlow is ready", exact: true })
    .waitFor();
  await page.getByLabel("Delete TaskFlow is ready", { exact: true }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    (await (await http.get(`/api/tasks?project_id=${projectId}`)).json())
      .length,
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "A little clarity. A lot of progress." })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile page fits viewport",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${frontend}/projects/${projectId}`);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your projects", exact: true })
    .waitFor();
  assert.equal((await http.get(`/api/projects/${projectId}`)).status(), 404);
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: project/task CRUD, status changes, search, persistence, confirmations, deep links, mobile navigation.",
  );
} finally {
  if (projectId) await http.delete(`/api/projects/${projectId}`);
  await http.dispose();
  await browser.close();
}
