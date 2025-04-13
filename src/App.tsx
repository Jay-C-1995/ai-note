import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  TextField, 
  Typography, 
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CreateIcon from '@mui/icons-material/Create';
import { generateSuggestions, expandSuggestion } from './services/api';
import './App.css';

interface Suggestion {
  id: number;
  text: string;
  expandedText?: string;
  isExpanded: boolean;
}

function App() {
  const [note, setNote] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanding, setIsExpanding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [modificationFeedback, setModificationFeedback] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  // 从本地存储加载保存的笔记
  useEffect(() => {
    const savedNote = localStorage.getItem('savedNote');
    if (savedNote) {
      setNote(savedNote);
    }
  }, []);

  const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNote(event.target.value);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('savedNote', note);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setError('保存失败，请重试');
    }
  };

  const handleSubmit = async () => {
    if (!note.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const generatedSuggestions = await generateSuggestions(note);
      setSuggestions(generatedSuggestions.map((text: string, index: number) => ({
        id: index + 1,
        text,
        isExpanded: false
      })));
    } catch (error) {
      setError('生成建议时出错，请稍后重试');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (suggestion.isExpanded) {
      setSuggestions(suggestions.map(s => 
        s.id === suggestion.id ? { ...s, isExpanded: false } : s
      ));
      return;
    }

    setIsExpanding(suggestion.id);
    setError(null);
    try {
      const expandedText = await expandSuggestion(note, suggestion.text);
      setSuggestions(suggestions.map(s => 
        s.id === suggestion.id 
          ? { ...s, isExpanded: true, expandedText }
          : s
      ));
    } catch (error) {
      setError('展开建议时出错，请稍后重试');
      console.error('Error:', error);
    } finally {
      setIsExpanding(null);
    }
  };

  const handleAdoptSuggestion = (suggestion: Suggestion) => {
    const newContent = suggestion.expandedText || suggestion.text;
    setNote(prevNote => 
      prevNote ? `${prevNote}\n\n${newContent}` : newContent
    );
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleModifySuggestion = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion);
    setModificationFeedback('');
  };

  const handleCloseModifyDialog = () => {
    setEditingSuggestion(null);
    setModificationFeedback('');
  };

  const handleSubmitModification = async () => {
    if (!editingSuggestion || !modificationFeedback.trim()) return;

    setIsModifying(true);
    setError(null);
    try {
      const expandedText = await expandSuggestion(
        note,
        `${editingSuggestion.text}\n\n修改意见：${modificationFeedback}`
      );
      
      setSuggestions(suggestions.map(s => 
        s.id === editingSuggestion.id 
          ? { ...s, expandedText }
          : s
      ));
      handleCloseModifyDialog();
    } catch (error) {
      setError('修改建议时出错，请稍后重试');
      console.error('Error:', error);
    } finally {
      setIsModifying(false);
    }
  };

  const handleCustomPromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(event.target.value);
  };

  const handleGenerateCustomSuggestion = async () => {
    if (!customPrompt.trim()) return;

    setIsGeneratingCustom(true);
    setError(null);
    try {
      const expandedText = await expandSuggestion(note, customPrompt);
      const newSuggestion: Suggestion = {
        id: suggestions.length + 1,
        text: customPrompt,
        expandedText,
        isExpanded: true
      };
      setSuggestions([...suggestions, newSuggestion]);
      setCustomPrompt('');
    } catch (error) {
      setError('生成自定义建议时出错，请稍后重试');
      console.error('Error:', error);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          AI 智能笔记
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={12}
            variant="outlined"
            placeholder="开始记录你的想法..."
            value={note}
            onChange={handleNoteChange}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Tooltip title="保存笔记">
              <IconButton 
                color="primary" 
                onClick={handleSave}
                disabled={!note.trim()}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="生成建议">
              <IconButton 
                color="primary" 
                onClick={handleSubmit}
                disabled={isLoading || !note.trim()}
              >
                {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {suggestions.length > 0 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              建议提示：
            </Typography>
            {suggestions.map((suggestion) => (
              <Box key={suggestion.id} sx={{ mb: 2 }}>
                <Chip
                  label={suggestion.text}
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{ mb: 1, cursor: 'pointer' }}
                  color={suggestion.isExpanded ? 'primary' : 'default'}
                />
                {suggestion.isExpanded && (
                  <Box sx={{ ml: 2 }}>
                    <Typography sx={{ mb: 1 }}>
                      {suggestion.expandedText}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleAdoptSuggestion(suggestion)}
                      >
                        采纳建议
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleModifySuggestion(suggestion)}
                      >
                        修改建议
                      </Button>
                    </Box>
                  </Box>
                )}
                {isExpanding === suggestion.id && (
                  <CircularProgress size={20} sx={{ ml: 1 }} />
                )}
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                自定义建议：
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  placeholder="输入您想要 AI 帮助展开的话题..."
                  value={customPrompt}
                  onChange={handleCustomPromptChange}
                />
                <Tooltip title="生成自定义建议">
                  <IconButton 
                    color="primary" 
                    onClick={handleGenerateCustomSuggestion}
                    disabled={isGeneratingCustom || !customPrompt.trim()}
                  >
                    {isGeneratingCustom ? <CircularProgress size={24} /> : <CreateIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Paper>
        )}

        <Dialog 
          open={!!editingSuggestion} 
          onClose={handleCloseModifyDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>修改建议</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="修改意见"
              fullWidth
              multiline
              rows={4}
              value={modificationFeedback}
              onChange={(e) => setModificationFeedback(e.target.value)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModifyDialog}>取消</Button>
            <Button 
              onClick={handleSubmitModification} 
              disabled={!modificationFeedback.trim() || isModifying}
              startIcon={isModifying ? <CircularProgress size={20} /> : null}
            >
              提交修改
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={saveSuccess} 
          autoHideDuration={3000} 
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" sx={{ width: '100%' }}>
            笔记已保存
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}

export default App;
