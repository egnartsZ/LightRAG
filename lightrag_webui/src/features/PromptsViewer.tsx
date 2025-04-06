import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { getPrompts, updatePrompt } from '@/api/lightrag'
import { Plus, Trash2 } from 'lucide-react'

interface Prompt {
  title: string
  description: string
  content: string
  is_json: boolean
}

interface PromptMap {
  [key: string]: Prompt
}

interface JsonEntry {
  content: string
  isEditing: boolean
}

interface JsonEntries {
  [key: string]: JsonEntry[]
}

export default function PromptsViewer() {
  const { t } = useTranslation()
  
  const PROMPT_TITLES: PromptMap = {
    entity_extraction: {
      title: t('prompts.entityExtraction.title'),
      description: t('prompts.entityExtraction.description'),
      content: '',
      is_json: false
    },
    entity_extraction_examples: {
      title: t('prompts.entityExtractionExamples.title'),
      description: t('prompts.entityExtractionExamples.description'),
      content: '',
      is_json: true
    },
    entity_summarization: {
      title: t('prompts.entitySummarization.title'),
      description: t('prompts.entitySummarization.description'),
      content: '',
      is_json: false
    },
    entity_continue_extraction: {
      title: t('prompts.entityContinueExtraction.title'),
      description: t('prompts.entityContinueExtraction.description'),
      content: '',
      is_json: false
    }
  }

  const [prompts, setPrompts] = useState<PromptMap>(PROMPT_TITLES)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [currentPrompt, setCurrentPrompt] = useState<string>('entity_extraction')
  const [jsonEntries, setJsonEntries] = useState<JsonEntries>({})

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      const promptsData = await getPrompts()
      
      const updatedPrompts = { ...PROMPT_TITLES }
      const updatedJsonEntries: JsonEntries = {}

      Object.keys(promptsData).forEach((key) => {
        if (updatedPrompts[key]) {
          let content = promptsData[key]
          if (updatedPrompts[key].is_json) {
            try {
              // content가 문자열이면 파싱
              const parsedContent = typeof content === 'string' ? JSON.parse(content) : content
              if (Array.isArray(parsedContent)) {
                updatedJsonEntries[key] = parsedContent.map((item: string) => ({
                  content: item.replace(/\\n/g, '\n'),
                  isEditing: false
                }))
                content = JSON.stringify(parsedContent, null, 2)
              }
            } catch (error) {
              console.error(`Failed to parse JSON content for ${key}:`, error)
              updatedJsonEntries[key] = []
              content = '[]'
            }
          }
          updatedPrompts[key] = {
            ...updatedPrompts[key],
            content
          }
        }
      })
      
      setJsonEntries(updatedJsonEntries)
      setPrompts(updatedPrompts)
    } catch (error) {
      console.error('Failed to load prompts:', error)
      toast(t('prompts.messages.loadError'))
    }
  }

  const handleEdit = (promptKey: string) => {
    setIsEditing(true)
    setEditedContent(prompts[promptKey].content)
    setCurrentPrompt(promptKey)
  }

  const handleEditJsonEntry = (promptKey: string, index: number) => {
    setJsonEntries(entries => ({
      ...entries,
      [promptKey]: entries[promptKey].map((entry, i) => ({
        ...entry,
        isEditing: i === index
      }))
    }))
  }

  const handleSaveJsonEntry = async (promptKey: string, index: number) => {
    setJsonEntries(entries => ({
      ...entries,
      [promptKey]: entries[promptKey].map((entry, i) => ({
        ...entry,
        isEditing: i === index ? false : entry.isEditing
      }))
    }))

    // 전체 JSON 배열 업데이트
    const jsonContent = jsonEntries[promptKey].map(entry => entry.content)

    try {
      const updatedContent = await updatePrompt(
        promptKey,
        jsonContent,
        true
      )

      setPrompts(prev => ({
        ...prev,
        [promptKey]: {
          ...prev[promptKey],
          content: Array.isArray(updatedContent) 
            ? JSON.stringify(updatedContent, null, 2)
            : updatedContent
        }
      }))

      toast(t('prompts.messages.saveSuccess'))
    } catch (error) {
      console.error('Failed to save JSON entry:', error)
      toast(t('prompts.messages.saveError'))
    }
  }

  const handleDeleteJsonEntry = async (promptKey: string, index: number) => {
    const updatedEntries = {
      ...jsonEntries,
      [promptKey]: jsonEntries[promptKey].filter((_, i) => i !== index)
    }
    setJsonEntries(updatedEntries)

    // 전체 JSON 배열 업데이트
    const jsonContent = updatedEntries[promptKey].map(entry => entry.content)

    try {
      const updatedContent = await updatePrompt(
        promptKey,
        JSON.stringify(jsonContent),
        true
      )

      // 업데이트된 내용을 파싱하여 적용
      const parsedContent = typeof updatedContent === 'string' ? JSON.parse(updatedContent) : updatedContent
      
      setPrompts(prev => ({
        ...prev,
        [promptKey]: {
          ...prev[promptKey],
          content: JSON.stringify(parsedContent, null, 2)
        }
      }))

      toast('Entry deleted successfully')
    } catch (error) {
      console.error('Failed to delete JSON entry:', error)
      toast('Failed to delete entry')
    }
  }

  const handleAddJsonEntry = (promptKey: string) => {
    setJsonEntries(entries => ({
      ...entries,
      [promptKey]: [
        ...(entries[promptKey] || []),
        {
          content: "Entity_types: []\nText:\n```\n\n```\n\nOutput:\n",
          isEditing: true
        }
      ]
    }))
  }

  const handleUpdateJsonEntry = (promptKey: string, index: number, newContent: string) => {
    setJsonEntries(entries => ({
      ...entries,
      [promptKey]: entries[promptKey].map((entry, i) => 
        i === index ? { ...entry, content: newContent } : entry
      )
    }))
  }

  const handleSave = async () => {
    try {
      const currentPromptData = prompts[currentPrompt]
      if (currentPromptData.is_json) {
        try {
          JSON.parse(editedContent)
        } catch (error) {
          toast('Invalid JSON format')
          return
        }
      }

      const updatedContent = await updatePrompt(
        currentPrompt, 
        editedContent,
        currentPromptData.is_json
      )
      
      setPrompts((prev) => ({
        ...prev,
        [currentPrompt]: {
          ...prev[currentPrompt],
          content: typeof updatedContent === 'object' 
            ? JSON.stringify(updatedContent, null, 2)
            : updatedContent
        }
      }))
      
      setIsEditing(false)
      toast(t('prompts.messages.saveSuccess'))
    } catch (error) {
      console.error('Failed to save prompt:', error)
      toast(t('prompts.messages.saveError'))
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedContent('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('prompts.title')}</CardTitle>
        <CardDescription>{t('prompts.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="entity_extraction" className="w-full">
          <TabsList>
            {Object.entries(prompts).map(([key, prompt]) => (
              <TabsTrigger key={key} value={key}>
                {prompt.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(prompts).map(([key, prompt]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <CardTitle>{prompt.title}</CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {prompt.is_json ? (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={() => handleAddJsonEntry(key)} className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add Example
                        </Button>
                      </div>
                      {jsonEntries[key]?.map((entry, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          {entry.isEditing ? (
                            <div className="space-y-4">
                              <Textarea
                                value={entry.content}
                                onChange={(e) => handleUpdateJsonEntry(key, index, e.target.value)}
                                className="min-h-[200px] font-mono whitespace-pre-wrap break-words"
                                style={{
                                  lineHeight: '1.5',
                                  tabSize: 2,
                                  padding: '1rem'
                                }}
                              />
                              <div className="flex justify-end gap-2">
                                <Button onClick={() => handleSaveJsonEntry(key, index)}>
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setJsonEntries(entries => ({
                                    ...entries,
                                    [key]: entries[key].map((e, i) => ({
                                      ...e,
                                      isEditing: i === index ? false : e.isEditing
                                    }))
                                  }))}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <pre className="whitespace-pre-wrap font-mono bg-muted p-4 rounded-md overflow-auto">
                                {entry.content}
                              </pre>
                              <div className="flex justify-end gap-2">
                                <Button onClick={() => handleEditJsonEntry(key, index)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeleteJsonEntry(key, index)}
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {isEditing && currentPrompt === key ? (
                        <>
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[300px] font-mono whitespace-pre-wrap break-words"
                            style={{
                              lineHeight: '1.5',
                              tabSize: 2,
                              padding: '1rem'
                            }}
                          />
                          <div className="flex gap-2 mt-4">
                            <Button onClick={handleSave}>{t('prompts.actions.save')}</Button>
                            <Button variant="outline" onClick={handleCancel}>
                              {t('prompts.actions.cancel')}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <pre className="whitespace-pre-wrap font-mono bg-muted p-4 rounded-md">
                            {prompt.content}
                          </pre>
                          <Button className="mt-4" onClick={() => handleEdit(key)}>
                            {t('prompts.actions.edit')}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
} 