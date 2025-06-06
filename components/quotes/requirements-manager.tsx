'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, X, FileText, Edit, Trash2 } from 'lucide-react'

interface Requirement {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
}

interface RequirementsManagerProps {
  requirements: string[] // Current simple requirements array
  onRequirementsChange: (requirements: string[]) => void
  quoteId?: string
  readOnly?: boolean
}

export function RequirementsManager({ 
  requirements, 
  onRequirementsChange, 
  quoteId,
  readOnly = false 
}: RequirementsManagerProps) {
  const [newRequirement, setNewRequirement] = useState('')
  const [isAddingRequirement, setIsAddingRequirement] = useState(false)

  const addRequirement = () => {
    if (newRequirement.trim() && !requirements.includes(newRequirement.trim())) {
      onRequirementsChange([...requirements, newRequirement.trim()])
      setNewRequirement('')
      setIsAddingRequirement(false)
    }
  }

  const removeRequirement = (index: number) => {
    onRequirementsChange(requirements.filter((_, i) => i !== index))
  }

  const updateRequirement = (index: number, newValue: string) => {
    const updated = [...requirements]
    updated[index] = newValue
    onRequirementsChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Requirements Management
          </CardTitle>
          {!readOnly && (
            <Dialog open={isAddingRequirement} onOpenChange={setIsAddingRequirement}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Requirement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Requirement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Requirement Description</Label>
                    <Textarea
                      placeholder="Describe the requirement in detail..."
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddingRequirement(false)
                        setNewRequirement('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={addRequirement}
                      disabled={!newRequirement.trim()}
                    >
                      Add Requirement
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requirements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No requirements added yet</p>
            {!readOnly && (
              <p className="text-xs mt-1">Click "Add Requirement" to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((requirement, index) => (
              <RequirementItem
                key={index}
                requirement={requirement}
                index={index}
                onUpdate={(newValue) => updateRequirement(index, newValue)}
                onRemove={() => removeRequirement(index)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        {requirements.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Requirements Summary</h4>
                <p className="text-sm text-blue-700">
                  {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} documented
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {requirements.length} Total
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface RequirementItemProps {
  requirement: string
  index: number
  onUpdate: (newValue: string) => void
  onRemove: () => void
  readOnly: boolean
}

function RequirementItem({ 
  requirement, 
  index, 
  onUpdate, 
  onRemove, 
  readOnly 
}: RequirementItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(requirement)

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== requirement) {
      onUpdate(editValue.trim())
    }
    setIsEditing(false)
    setEditValue(requirement)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(requirement)
  }

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              REQ-{(index + 1).toString().padStart(3, '0')}
            </Badge>
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">
              {requirement}
            </p>
          )}
        </div>

        {!readOnly && !isEditing && (
          <div className="flex gap-1 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Quick add component for inline requirement addition
export function QuickAddRequirement({ 
  onAdd, 
  placeholder = "Add a requirement..." 
}: { 
  onAdd: (requirement: string) => void
  placeholder?: string 
}) {
  const [value, setValue] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
      setIsExpanded(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAdd()
    } else if (e.key === 'Escape') {
      setValue('')
      setIsExpanded(false)
    }
  }

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="w-full justify-start text-gray-500"
      >
        <Plus className="w-4 h-4 mr-2" />
        {placeholder}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={!value.trim()}>
          Add
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => {
            setValue('')
            setIsExpanded(false)
          }}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Press Ctrl+Enter to add quickly, Escape to cancel
      </p>
    </div>
  )
}
