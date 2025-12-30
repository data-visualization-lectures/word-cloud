import { useState, useCallback } from 'react'
import { api } from '../lib/api'
import type { ProjectMeta, CreateProjectPayload, UpdateProjectPayload } from '../types'

export function useProject() {
    const [currentProject, setCurrentProject] = useState<ProjectMeta | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const loadProject = useCallback(async (id: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await api.getProject(id)
            // We don't get metadata from getProject (it returns raw JSON),
            // so if we want metadata we should probably trust the one from list or fetch it separately if needed.
            // However, usually we load from the list, so we might already have metadata.
            // If we need to set CurrentProject meta, we might need to fetch list or change API to return Meta + Data.
            // Based on spec: GET /api/projects/[id] returns just the JSON body.
            // So detailed metadata (like updated_at) is best served from the list or we assume it's updated.

            // Since we don't have an endpoint to get single project META,
            // we usually rely on the list item we clicked.
            // But here we might just return the data.
            return data
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load project'))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createNewProject = useCallback(async (payload: CreateProjectPayload) => {
        setIsLoading(true)
        setError(null)
        try {
            const project = await api.createProject(payload)
            setCurrentProject(project)
            return project
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to create project'))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const updateCurrentProject = useCallback(async (payload: UpdateProjectPayload) => {
        if (!currentProject) throw new Error('No project is currently open')

        setIsLoading(true)
        setError(null)
        try {
            const project = await api.updateProject(currentProject.id, payload)
            setCurrentProject(project)
            return project
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to update project'))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [currentProject])

    const resetProject = useCallback(() => {
        setCurrentProject(null)
        setError(null)
    }, [])

    return {
        currentProject,
        setCurrentProject, // Allow manual setting (e.g. from list selection)
        isLoading,
        error,
        loadProject,
        createNewProject,
        updateCurrentProject,
        resetProject
    }
}
