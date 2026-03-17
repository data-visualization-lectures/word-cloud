import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ProjectMeta } from '../types'
import { useI18n } from '../i18n'

interface ProjectListModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (project: ProjectMeta) => void
}

export function ProjectListModal({ isOpen, onClose, onSelect }: ProjectListModalProps) {
    const { locale, t } = useI18n()
    const [projects, setProjects] = useState<ProjectMeta[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deleteConfirms, setDeleteConfirms] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (isOpen) {
            fetchProjects()
        }
    }, [isOpen])

    const fetchProjects = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await api.listProjects('word-cloud')
            setProjects(data)
        } catch (err) {
            console.error(err)
            setError(t('projectList.error'))
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (deleteConfirms.has(id)) {
            handleDelete(id)
        } else {
            setDeleteConfirms(prev => {
                const next = new Set(prev)
                next.add(id)
                return next
            })
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
            alert(t('projectList.deleteFailed'))
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content list-modal" role="dialog" aria-modal="true">
                <header className="modal-header">
                    <h2>{t('projectList.title')}</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </header>

                {loading && <div className="loading-message">{t('projectList.loading')}</div>}
                {error && <div className="error-message">{error}</div>}

                {!loading && projects.length === 0 && (
                    <div className="empty-message">{t('projectList.empty')}</div>
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
                                    {new Date(project.updated_at).toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US')}
                                </time>
                            </div>
                            <button
                                className={`delete-button ${deleteConfirms.has(project.id) ? 'confirm' : ''}`}
                                onClick={(e) => handleDeleteClick(e, project.id)}
                                title={t('projectList.delete')}
                            >
                                {deleteConfirms.has(project.id) ? t('projectList.deleteConfirm') : '🗑️'}
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
