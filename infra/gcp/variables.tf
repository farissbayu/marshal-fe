variable "project_id" {
  description = "GCP project that hosts the app. Billing must already be enabled."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run, the serverless NEG and Artifact Registry."
  type        = string
  default     = "asia-southeast2"
}

variable "name_prefix" {
  description = "Prefix used for resource names."
  type        = string
  default     = "marshal-threejs"

  validation {
    condition     = can(regex("^[a-z][-a-z0-9]{1,18}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must be 3-20 lowercase letters, digits, or hyphens, starting with a letter and ending with a letter or digit."
  }
}

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to deploy through Workload Identity Federation."
  type        = string
  default     = "farissbayu/marshal-fe"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must look like owner/name."
  }
}

variable "github_branch" {
  description = "Only GitHub Actions runs on this branch may obtain deploy credentials."
  type        = string
  default     = "threejs"
}

variable "github_workflow_file" {
  description = "Workflow file (under .github/workflows/) that may obtain deploy credentials. Pinned via the workflow_ref OIDC claim."
  type        = string
  default     = "deploy-cloudrun.yml"
}

variable "github_repository_id" {
  description = "Optional numeric GitHub repository id (gh api repos/OWNER/NAME --jq .id). When set, WIF also pins it, which survives repo renames and rejects a re-created repo with the same name."
  type        = string
  default     = ""

  validation {
    condition     = can(regex("^[0-9]*$", var.github_repository_id))
    error_message = "github_repository_id must be numeric (or empty)."
  }
}

variable "ai_rate_limit_per_minute" {
  description = "Cloud Armor limit on server function (Gemini / A*) requests per client IP per minute. Excess requests get HTTP 429 and the browser falls back to the offline answers."
  type        = number
  default     = 120

  validation {
    condition     = var.ai_rate_limit_per_minute >= 1
    error_message = "ai_rate_limit_per_minute must be at least 1."
  }
}

variable "domain" {
  description = "Optional domain (e.g. marshal.example.com). When set, a Google-managed certificate is created, the LB serves HTTPS and HTTP redirects to HTTPS. When empty, the LB serves plain HTTP on its IP."
  type        = string
  default     = ""
}

variable "gemini_location" {
  description = "Vertex AI location used for Gemini calls (GOOGLE_CLOUD_LOCATION)."
  type        = string
  default     = "asia-southeast1"
}

variable "gemini_model" {
  description = "Gemini model used by all AI tasks (GEMINI_MODEL)."
  type        = string
  default     = "gemini-2.5-flash"
}

variable "min_instances" {
  description = "Minimum Cloud Run instances. 0 scales to zero (cold starts); 1 keeps one warm instance."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum Cloud Run instances. Also caps Gemini spend under load."
  type        = number
  default     = 3

  validation {
    condition     = var.max_instances >= 1
    error_message = "max_instances must be at least 1."
  }
}

variable "image" {
  description = "Container image for the first apply. CI deploys later images; Terraform ignores image drift."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "labels" {
  description = "Additional labels applied to the Cloud Run service and Artifact Registry repository."
  type        = map(string)
  default     = {}
}
