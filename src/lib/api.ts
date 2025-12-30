import type { CreateProjectPayload, ProjectMeta, UpdateProjectPayload, ProjectData } from '../types'

const API_BASE_URL = 'https://api.dataviz.jp'

class ApiError extends Error {
    code: string
    constructor(message: string, code: string) {
        super(message)
        this.name = 'ApiError'
        this.code = code
    }
}

function getAuthToken(): string | null {
    // @ts-ignore
    const session = window.datavizAuth?.session
    return session?.access_token || null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken()
    if (!token) {
        throw new ApiError('Not authenticated', 'not_authenticated')
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        let errorData
        try {
            errorData = await response.json()
        } catch {
            // ignore
        }
        const errorCode = errorData?.error || 'unknown_error'
        const errorMessage = errorData?.detail || response.statusText
        throw new ApiError(errorMessage, errorCode)
    }

    // Handle empty responses (e.g. DELETE)
    if (response.status === 204) {
        return {} as T
    }

    // Retrieve Content-Type to decide how to parse
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
        return response.json()
    }

    // Return blob or text if needed, but for now we default to expected JSON or void
    return {} as T
}

export const api = {
    async listProjects(appName: string): Promise<ProjectMeta[]> {
        const response = await request<{ projects: ProjectMeta[] }>(`/api/projects?app=${appName}`)
        return response.projects
    },

    async createProject(payload: CreateProjectPayload): Promise<ProjectMeta> {
        const response = await request<{ project: ProjectMeta }>('/api/projects', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        return response.project
    },

    async getProject(id: string): Promise<ProjectData> {
        return request<ProjectData>(`/api/projects/${id}`)
    },

    async updateProject(id: string, payload: UpdateProjectPayload): Promise<ProjectMeta> {
        const response = await request<{ project: ProjectMeta }>(`/api/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        })
        return response.project
    },

    async deleteProject(id: string): Promise<void> {
        await request<{ success: boolean }>(`/api/projects/${id}`, {
            method: 'DELETE',
        })
    },

    async getThumbnailBlob(id: string): Promise<Blob> {
        const token = getAuthToken()
        if (!token) {
            throw new ApiError('Not authenticated', 'not_authenticated')
        }
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}/thumbnail`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        if (!response.ok) {
            throw new Error('Failed to fetch thumbnail')
        }
        return response.blob()
    }
}
