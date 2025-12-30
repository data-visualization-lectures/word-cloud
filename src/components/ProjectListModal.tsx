import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ProjectMeta } from '../types'
// import { blobToBase64 } from '../lib/image-utils' // If needed, but here we just read from API

interface ProjectListModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (project: ProjectMeta) => void
}

export function ProjectListModal({ isOpen, onClose, onSelect }: ProjectListModalProps) {
    const [projects, setProjects] = useState<ProjectMeta[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deleteConfirms, setDeleteConfirms] = useState<Set<string>>(new Set()) // Store IDs pending delete confirmation

    useEffect(() => {
        if (isOpen) {
            fetchProjects()
        }
    }, [isOpen])

    const fetchProjects = async () => {
        setLoading(true)
        setError(null)
        try {
            // Assuming app_name is 'word-cloud'
            const data = await api.listProjects('word-cloud')
            setProjects(data)
        } catch (err) {
            console.error(err)
            setError('プロジェクト一覧の取得に失敗しました。')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (deleteConfirms.has(id)) {
            // Execute delete
            handleDelete(id)
        } else {
            // First click: Request confirmation
            setDeleteConfirms(prev => {
                const next = new Set(prev)
                next.add(id)
                return next
            })
            // Auto-reset confirmation after 3 seconds
            setTimeout(() => {
                setDeleteConfirms(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
            }, 3000)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await api.deleteProject(id)
            setProjects(prev => prev.filter(p => p.id !== id))
            setDeleteConfirms(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        } catch (err) {
            console.error(err)
            alert('削除に失敗しました。')
        }
    }

    // Helper to fetch thumbnail URL safely
    // For the actual image source, the spec says "thumbnail_path": "user_id/uuid.png".
    // This is likely a STORAGE PATH, not a direct public URL?
    // Spec says: GET /api/projects/[id]/thumbnail -> Returns PNG binary.
    // So we can set src={`/api/projects/${p.id}/thumbnail`} BUT we need Auth header.
    // Standard <img> tag cannot send Auth header.
    // So we have to fetch blob and create Object URL for each, or use a component that handles this.

    // For simplicity MVP, let's create a sub-component <ProjectThumbnail />

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content list-modal" role="dialog" aria-modal="true">
                <header className="modal-header">
                    <h2>プロジェクトを開く</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </header>

                {loading && <div className="loading-message">読み込み中...</div>}
                {error && <div className="error-message">{error}</div>}

                {!loading && projects.length === 0 && (
                    <div className="empty-message">保存されたプロジェクトはありません。</div>
                )}

                <div className="project-grid">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            className="project-card"
                            onClick={() => onSelect(project)}
                        >
                            <div className="project-thumbnail">
                                <ProjectThumbnail projectId={project.id} />
                            </div>
                            <div className="project-info">
                                <h3 className="project-title">{project.name}</h3>
                                <time className="project-date">
                                    {new Date(project.updated_at).toLocaleString('ja-JP')}
                                </time>
                            </div>
                            <button
                                className={`delete-button ${deleteConfirms.has(project.id) ? 'confirm' : ''}`}
                                onClick={(e) => handleDeleteClick(e, project.id)}
                                title="削除"
                            >
                                {deleteConfirms.has(project.id) ? '削除?' : '🗑️'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ProjectThumbnail({ projectId }: { projectId: string }) {
    const [src, setSrc] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        api.getThumbnailBlob(projectId)
            .then(blob => {
                if (active) {
                    setSrc(URL.createObjectURL(blob))
                }
            })
            .catch(() => {
                // ignore error or show fallback
            })

        return () => {
            active = false
            if (src) URL.revokeObjectURL(src)
        }
    }, [projectId])

    if (!src) return <div className="thumbnail-placeholder"></div>
    return <img src={src} alt="" loading="lazy" />
}
