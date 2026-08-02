import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type VikunjaNoteTasksPlugin from "./main";
import { VikunjaClient, describeVikunjaError } from "./api";
import { parseFolderMappings } from "./routing";

/**
 * The plugin's settings tab: connection details, defaults, and a connection
 * test that doubles as the way to populate the project dropdown.
 */
export class VikunjaSettingTab extends PluginSettingTab {
	private readonly plugin: VikunjaNoteTasksPlugin;

	constructor(app: App, plugin: VikunjaNoteTasksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Shows how the folder rules parsed: each valid rule with the project it
	 * resolves to (by cached name when known), and each unparseable line. Rules
	 * that don't parse are skipped at capture time, so they must be visible here.
	 */
	private renderFolderRulePreview(target: HTMLElement): void {
		target.empty();
		const raw = this.plugin.settings.folderMappings;
		if (!raw.trim()) return;

		const { mappings, errors } = parseFolderMappings(raw);
		const projectsById = new Map(
			this.plugin.settings.cachedProjects.map((p) => [p.id, p.title]),
		);

		for (const mapping of mappings) {
			const title = projectsById.get(mapping.projectId);
			const line = target.createDiv({ cls: "vnt-folder-rule" });
			if (title) {
				line.setText(`${mapping.pattern} → ${title} (#${mapping.projectId})`);
			} else {
				line.addClass("vnt-is-warning");
				line.setText(
					`${mapping.pattern} → project #${mapping.projectId} ` +
						"(not in the loaded project list — run Test connection to check)",
				);
			}
		}

		for (const error of errors) {
			const line = target.createDiv({
				cls: "vnt-folder-rule vnt-is-error",
			});
			line.setText(`Line ${error.line} ignored — ${error.reason}: ${error.text}`);
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("Your Vikunja instance root, e.g. https://vikunja.example.com")
			.addText((text) =>
				text
					.setPlaceholder("https://vikunja.example.com")
					.setValue(this.plugin.settings.baseUrl)
					.onChange(async (value) => {
						this.plugin.settings.baseUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("API token")
			.setDesc("Create one in Vikunja under Settings → API Tokens.")
			.addText((text) => {
				text
					.setPlaceholder("Paste your API token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.type = "password";
				text.inputEl.autocomplete = "off";
			});

		const tokenNote = containerEl.createDiv({ cls: "vnt-setting-token-note" });
		tokenNote.setText(
			"The token is stored unencrypted in this vault's plugin data. Use a " +
				"least-privilege API token (read/write on tasks, projects, and labels) " +
				"and revoke it if the vault is ever shared.",
		);

		new Setting(containerEl)
			.setName("Default project")
			.setDesc(
				'New tasks are created here. Run "Test connection" below to load the list.',
			)
			.addDropdown((dropdown) => {
				const projects = this.plugin.settings.cachedProjects;
				if (projects.length === 0) {
					dropdown.addOption("", "(run Test connection to load projects)");
				} else {
					dropdown.addOption("", "(none)");
					for (const project of projects) {
						dropdown.addOption(String(project.id), project.title);
					}
				}
				dropdown.setValue(
					this.plugin.settings.defaultProjectId !== null
						? String(this.plugin.settings.defaultProjectId)
						: "",
				);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultProjectId = value
						? parseInt(value, 10)
						: null;
					const found = this.plugin.settings.cachedProjects.find(
						(p) => String(p.id) === value,
					);
					this.plugin.settings.defaultProjectName = found ? found.title : "";
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Folder rules")
			.setDesc(
				'One rule per line, "pattern = project ID". Used only when a note has ' +
					'no vikunja-project frontmatter. A pattern without "/" matches any ' +
					'folder name at any depth, so "1204 *" keeps working when the folder ' +
					"moves. First match wins; # starts a comment.",
			)
			.addTextArea((textArea) => {
				textArea
					.setPlaceholder("1204 * = 7\nClients/Acme/** = 12")
					.setValue(this.plugin.settings.folderMappings)
					.onChange(async (value) => {
						this.plugin.settings.folderMappings = value;
						await this.plugin.saveSettings();
						this.renderFolderRulePreview(preview);
					});
				textArea.inputEl.rows = 5;
				textArea.inputEl.addClass("vnt-folder-rules-input");
			});

		const preview = containerEl.createDiv({ cls: "vnt-folder-rules-preview" });
		this.renderFolderRulePreview(preview);

		new Setting(containerEl)
			.setName("Default labels")
			.setDesc(
				"Comma-separated labels applied to every created task. Labels that " +
					"don't exist yet are created.",
			)
			.addText((text) =>
				text
					.setPlaceholder("inbox, from-obsidian")
					.setValue(this.plugin.settings.defaultLabels)
					.onChange(async (value) => {
						this.plugin.settings.defaultLabels = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Include undated tasks")
			.setDesc(
				'Also list tasks with no due date in "Insert today\'s Vikunja tasks".',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeUndated)
					.onChange(async (value) => {
						this.plugin.settings.includeUndated = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Parse Tasks-plugin emoji dates")
			.setDesc(
				"Read a 📅 YYYY-MM-DD due date off the captured line, and keep emoji " +
					"date fields (📅 ⏳ 🛫 ➕ ✅) out of the task title. Turn this off to " +
					"treat them as ordinary title text.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.parseEmojiDates)
					.onChange(async (value) => {
						this.plugin.settings.parseEmojiDates = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Open in browser after create")
			.setDesc("Open each newly created task in your browser.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openInBrowserAfterCreate)
					.onChange(async (value) => {
						this.plugin.settings.openInBrowserAfterCreate = value;
						await this.plugin.saveSettings();
					}),
			);

		const testSetting = new Setting(containerEl)
			.setName("Test connection")
			.setDesc(
				"Fetch projects to verify the URL and token, and fill the project dropdown.",
			);
		const resultEl = containerEl.createDiv({
			cls: "vnt-test-connection-result",
		});
		testSetting.addButton((button) =>
			button
				.setButtonText("Test connection")
				.setCta()
				.onClick(async () => {
					resultEl.className = "vnt-test-connection-result";
					resultEl.setText("Testing…");
					button.setDisabled(true);
					try {
						const client = new VikunjaClient({
							baseUrl: this.plugin.settings.baseUrl,
							token: this.plugin.settings.apiToken,
						});
						const projects = await client.listProjects();
						this.plugin.settings.cachedProjects = projects.map((p) => ({
							id: p.id,
							title: p.title,
						}));
						await this.plugin.saveSettings();
						new Notice(
							`Vikunja: connected — loaded ${projects.length} project(s).`,
						);
						// Re-render so the dropdown reflects the freshly loaded projects.
						this.display();
					} catch (err) {
						const message = describeVikunjaError(err);
						resultEl.addClass("vnt-is-error");
						resultEl.setText(message);
						new Notice(`Vikunja: ${message}`);
					} finally {
						button.setDisabled(false);
					}
				}),
		);
	}
}
