// ─────────────────────────────────────────────────────────────────────────────
// lib/gitlab-api.ts
// A thin wrapper around the GitLab REST API.
// Think of it like your axios instance in an Express backend.
// All the raw HTTP calls live here so agents stay clean.
// ─────────────────────────────────────────────────────────────────────────────

import axios, { AxiosInstance } from "axios";
import { logger } from "./logger";
import { GitLabSastReport } from "./types";

const log = logger("GitLabAPI");

export class GitLabClient {
  private http: AxiosInstance;
  private projectId: string;

  constructor(baseUrl: string, token: string, projectId: string) {
    // Encode the project path so slashes don't break the URL
    // e.g. "mybusiness/my-app" → "mybusiness%2Fmy-app"
    this.projectId = encodeURIComponent(projectId);

    this.http = axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
    });
  }

  // ── Repository ─────────────────────────────────────────────────────────────

  /** Get the raw content of a file at a specific ref (branch/commit) */
  async getFileContent(filePath: string, ref: string): Promise<string> {
    const encodedPath = encodeURIComponent(filePath);
    const res = await this.http.get(
      `/projects/${this.projectId}/repository/files/${encodedPath}/raw`,
      { params: { ref } }
    );
    return res.data as string;
  }

  /** Create a new branch from an existing ref */
  async createBranch(branchName: string, fromRef: string): Promise<void> {
    log.info(`Creating branch: ${branchName} from ${fromRef}`);
    await this.http.post(`/projects/${this.projectId}/repository/branches`, {
      branch: branchName,
      ref: fromRef,
    });
  }

  /** Commit a file change to a branch */
  async commitFile(
    branchName: string,
    filePath: string,
    content: string,
    commitMessage: string
  ): Promise<void> {
    log.info(`Committing fix to ${filePath} on ${branchName}`);
    await this.http.post(`/projects/${this.projectId}/repository/commits`, {
      branch: branchName,
      commit_message: commitMessage,
      actions: [
        {
          action: "update",   // "update" modifies an existing file
          file_path: filePath,
          content,
          encoding: "text",
        },
      ],
    });
  }

  // ── Merge Requests ─────────────────────────────────────────────────────────

  /** Open a new Merge Request */
  async createMergeRequest(options: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
    labels?: string[];
  }): Promise<{ iid: number; web_url: string }> {
    log.info(`Opening MR: ${options.title}`);
    const res = await this.http.post(`/projects/${this.projectId}/merge_requests`, {
      source_branch: options.sourceBranch,
      target_branch: options.targetBranch,
      title: options.title,
      description: options.description,
      labels: (options.labels ?? []).join(","),
      remove_source_branch: true,
    });
    return { iid: res.data.iid, web_url: res.data.web_url };
  }

  /** Post a comment on a Merge Request */
  async commentOnMR(mrIid: number, body: string): Promise<void> {
    log.info(`Posting compliance note on MR !${mrIid}`);
    await this.http.post(
      `/projects/${this.projectId}/merge_requests/${mrIid}/notes`,
      { body }
    );
  }

  // ── CI / Pipeline ──────────────────────────────────────────────────────────

  /**
   * Fetch the latest SAST report artifact from a given pipeline.
   * GitLab stores SAST output as gl-sast-report.json inside the pipeline artifacts.
   */
  async getSastReport(pipelineId: number): Promise<GitLabSastReport> {
    log.info(`Fetching SAST report for pipeline ${pipelineId}`);
    try {
      const res = await this.http.get(
        `/projects/${this.projectId}/pipelines/${pipelineId}/artifacts`,
        { params: { job: "sast" } }
      );
      return res.data as GitLabSastReport;
    } catch {
      // Fallback: try downloading the raw artifact file directly
      const res = await this.http.get(
        `/projects/${this.projectId}/jobs/artifacts/main/raw/gl-sast-report.json`,
        { params: { job: "sast" } }
      );
      return res.data as GitLabSastReport;
    }
  }

  /** Get the default branch name for the project */
  async getDefaultBranch(): Promise<string> {
    const res = await this.http.get(`/projects/${this.projectId}`);
    return res.data.default_branch as string;
  }
}
