import React, { useState, useMemo, useEffect } from 'react';
import { Container, Typography, Paper, Button, Grid, Box, Alert, CircularProgress, TextField, InputAdornment, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

const PreferencesPage = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [columnOrder, setColumnOrder] = useState([]);

  // Filter data based on search text
  const handleSearch = (event) => {
    const searchValue = event.target.value;
    setSearchText(searchValue);
    
    if (!uploadedData) return;
    
    if (!searchValue.trim()) {
      setFilteredData(uploadedData);
      return;
    }
    
    const filtered = uploadedData.filter(row => {
      return Object.values(row).some(value => 
        value !== null && 
        value !== undefined && 
        String(value).toLowerCase().includes(searchValue.toLowerCase())
      );
    });
    
    setFilteredData(filtered);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchText('');
    setFilteredData(uploadedData);
  };

  // Use memoized data for the grid
  const gridData = useMemo(() => {
    return searchText ? filteredData : uploadedData;
  }, [searchText, filteredData, uploadedData]);

  // Reset selection when data changes
  useEffect(() => {
    if (uploadedData) {
      setSelectedRows([]);
    }
  }, [uploadedData]);

  // Handle delete selected rows
  const handleDeleteRows = () => {
    if (selectedRows.length === 0) return;
    
    // Create a new array without the selected rows
    const updatedData = uploadedData.filter(row => !selectedRows.includes(row.id));
    
    // Update both the main data and filtered data
    setUploadedData(updatedData);
    setFilteredData(updatedData);
    setSelectedRows([]);
    
    setUploadStatus({
      type: 'success',
      message: `${selectedRows.length} row(s) deleted successfully.`
    });
  };

  // Handle add new row
  const handleAddRow = () => {
    if (!uploadedData || uploadedData.length === 0) return;
    
    // Create a new row with default values based on the first row's structure
    const firstRow = uploadedData[0];
    const newRowData = {};
    
    Object.keys(firstRow).forEach(key => {
      if (key === 'id') {
        // Generate a new ID (max id + 1)
        const maxId = Math.max(...uploadedData.map(row => row.id));
        newRowData[key] = maxId + 1;
      } else {
        // Set default values based on the column type
        newRowData[key] = '';
      }
    });
    
    setNewRow(newRowData);
    setOpenAddDialog(true);
  };

  // Handle save new row
  const handleSaveNewRow = () => {
    const updatedData = [...uploadedData, newRow];
    setUploadedData(updatedData);
    setFilteredData(updatedData);
    setOpenAddDialog(false);
    
    setUploadStatus({
      type: 'success',
      message: 'New row added successfully.'
    });
  };

  // Handle edit row
  const handleEditRow = (row) => {
    setEditingRow(row);
    setOpenEditDialog(true);
  };

  // Handle save edited row
  const handleSaveEditedRow = () => {
    if (!editingRow) return;
    
    const updatedData = uploadedData.map(row => 
      row.id === editingRow.id ? editingRow : row
    );
    
    setUploadedData(updatedData);
    setFilteredData(updatedData);
    setOpenEditDialog(false);
    
    setUploadStatus({
      type: 'success',
      message: 'Row updated successfully.'
    });
  };

  // Handle cell edit
  const handleCellEdit = async (params) => {
    const { id, field, value } = params;
    
    const updatedData = uploadedData.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    
    setUploadedData(updatedData);
    setFilteredData(updatedData);

    // Save changes to database immediately
    try {
      const response = await axios.post('/api/preferences/save', {
        data: updatedData
      });
      
      if (response.data.success) {
        setUploadStatus({
          type: 'success',
          message: 'Changes saved successfully.'
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to save changes.'
        });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setUploadStatus({
        type: 'error',
        message: 'Error saving changes.'
      });
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setUploadStatus(null);
    
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post('/api/preferences/import', formData);
      
      if (response.data.success) {
        // Store the column order from the backend response
        if (response.data.columnOrder && response.data.columnOrder.length > 0) {
          setColumnOrder(response.data.columnOrder);
        }
        
        setUploadedData(response.data.data);
        setFilteredData(response.data.data);
        setUploadStatus({
          type: 'success',
          message: 'File processed successfully! Review the data below.'
        });
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus({
        type: 'error',
        message: error.message || 'Error processing file. Please check the format and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleProcess = async () => {
    if (!uploadedData) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload data first.'
      });
      return;
    }

    try {
      const response = await axios.post('/api/process-preferences', {
        data: uploadedData
      });

      if (response.data.success) {
        setUploadStatus({
          type: 'success',
          message: 'Data processed successfully!'
        });
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error.message
      });
    }
  };

  // Generate form fields for add/edit dialogs
  const generateFormFields = (row, isEdit = false) => {
    if (!row || Object.keys(row).length === 0) return null;
    
    return Object.keys(row).filter(key => key !== 'id').map(key => (
      <TextField
        key={key}
        margin="dense"
        label={key}
        fullWidth
        variant="outlined"
        value={isEdit ? editingRow[key] : newRow[key] || ''}
        onChange={(e) => {
          if (isEdit) {
            setEditingRow({ ...editingRow, [key]: e.target.value });
          } else {
            setNewRow({ ...newRow, [key]: e.target.value });
          }
        }}
        sx={{ mb: 2 }}
      />
    ));
  };

  // Add a function to load data from the database
  const loadDataFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/preferences/load');
      
      if (response.data.success) {
        if (response.data.data.length > 0) {
          setUploadedData(response.data.data);
          setFilteredData(response.data.data);
          setColumnOrder(response.data.columnOrder);
          setUploadStatus({
            type: 'success',
            message: 'Data loaded from database successfully.'
          });
        } else {
          setUploadStatus({
            type: 'info',
            message: 'No data found in database. Please upload a preferences file.'
          });
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to load data from database.'
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setUploadStatus({
        type: 'error',
        message: 'Error loading data from database.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to save data to the database
  const saveDataToDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/preferences/save', {
        data: uploadedData
      });
      
      if (response.data.success) {
        setUploadStatus({
          type: 'success',
          message: response.data.message || 'Preferences saved successfully.'
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to save preferences.'
        });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setUploadStatus({
        type: 'error',
        message: 'Error saving preferences.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to clear data from the database
  const clearDataFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/preferences/clear');
      
      if (response.data.success) {
        setUploadedData(null);
        setFilteredData(null);
        setColumnOrder([]);
        setUploadStatus({
          type: 'success',
          message: response.data.message || 'Preferences data cleared successfully.'
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to clear preferences data.'
        });
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      setUploadStatus({
        type: 'error',
        message: 'Error clearing preferences data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data from database when component mounts
  useEffect(() => {
    loadDataFromDatabase();
  }, []);

  return (
    <Container maxWidth="xl">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 3, 
          mb: 4, 
          background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)',
          borderRadius: '16px'
        }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 700, color: '#2c3e50' }}
          >
            Student Preferences
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#78909c',
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Import Excel sheets with student preference data. Edit the data in the table and save your changes to the database.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box 
              {...getRootProps()} 
              sx={{
                border: isDragActive ? '3px dashed #f093fb' : '2px dashed #e0e0e0',
                borderRadius: '16px',
                p: 4,
                textAlign: 'center',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                bgcolor: isDragActive ? 'rgba(240, 147, 251, 0.08)' : 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: isLoading ? 'transparent' : 'rgba(240, 147, 251, 0.04)',
                  borderColor: '#f093fb',
                  transform: isLoading ? 'none' : 'translateY(-2px)',
                  boxShadow: isLoading ? 'none' : '0 8px 24px rgba(0,0,0,0.08)'
                }
              }}
            >
              <input {...getInputProps()} disabled={isLoading} />
              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={40} thickness={4} sx={{ color: '#f093fb' }} />
                  <Typography variant="h6" sx={{ color: '#546e7a' }}>Processing file...</Typography>
                </Box>
              ) : (
                <Box>
                  <Box 
                    sx={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f093fb22 0%, #f5576c11 100%)',
                      mb: 2
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 40, color: '#f093fb' }} />
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 600 }}>
                    {isDragActive ? 'Drop the file here' : 'Upload Student Preferences'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78909c', mb: 1 }}>
                    Drag and drop an Excel or CSV file, or click to browse
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#b0bec5' }}>
                    Accepted formats: .xlsx, .xls, .csv
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>          
          {file && (
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: '12px', 
                  bgcolor: 'rgba(240, 147, 251, 0.08)',
                  border: '1px solid rgba(240, 147, 251, 0.2)'
                }}
              >
                <Typography variant="body2" sx={{ color: '#546e7a' }}>
                  <strong>Selected file:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </Typography>
              </Box>
            </Grid>
          )}

          {uploadStatus && (
            <Grid item xs={12}>
              <Alert 
                severity={uploadStatus.type}
                sx={{
                  borderRadius: '12px',
                  '& .MuiAlert-icon': {
                    fontSize: '24px'
                  }
                }}
              >
                {uploadStatus.message}
              </Alert>
            </Grid>
          )}

          {uploadedData && (
            <Grid item xs={12}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    variant="outlined"
                    placeholder="Search across all columns..."
                    value={searchText}
                    onChange={handleSearch}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#f093fb' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchText && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleClearSearch}>
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      width: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        '&:hover fieldset': {
                          borderColor: '#f093fb',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#f093fb',
                        }
                      }
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Refresh data from database">
                    <Button
                      variant="outlined"
                      onClick={loadDataFromDatabase}
                      startIcon={<RefreshIcon />}
                      size="small"
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#f093fb',
                        color: '#f093fb',
                        '&:hover': {
                          borderColor: '#f093fb',
                          backgroundColor: 'rgba(240, 147, 251, 0.08)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(240, 147, 251, 0.2)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                  <Tooltip title="Save preferences to database">
                    <Button
                      variant="contained"
                      onClick={saveDataToDatabase}
                      startIcon={<SaveIcon />}
                      disabled={!uploadedData || uploadedData.length === 0}
                      size="small"
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(240, 147, 251, 0.4)'
                        },
                        '&:disabled': {
                          background: '#e0e0e0',
                          color: '#9e9e9e'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Save
                    </Button>
                  </Tooltip>
                  <Tooltip title="Clear database">
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={clearDataFromDatabase}
                      startIcon={<DeleteIcon />}
                      disabled={!uploadedData || uploadedData.length === 0}
                      size="small"
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(220, 0, 78, 0.2)'
                        }
                      }}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                  <Tooltip title="Add new row">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleAddRow}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)'
                        }
                      }}
                    >
                      Add Row
                    </Button>
                  </Tooltip>
                  <Tooltip title="Delete selected rows">
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteRows}
                      disabled={selectedRows.length === 0}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(220, 0, 78, 0.3)'
                        }
                      }}
                    >
                      Delete ({selectedRows.length})
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 0, 
                  height: 'calc(100vh - 250px)', 
                  minHeight: '600px',
                  width: '100%', 
                  overflow: 'hidden',
                  borderRadius: '16px',
                  border: 'none'
                }}
              >
                <DataGrid
                  rows={gridData || []}
                  columns={columnOrder.length > 0 
                    ? columnOrder.map((key) => ({
                        field: key,
                        headerName: key,
                        width: key.toLowerCase().includes('first name') || key.toLowerCase().includes('last name') ? 150 :
                               key.toLowerCase().includes('email') ? 200 : 
                               key.toLowerCase().includes('total') ? 100 : 120,
                        editable: true,
                        headerClassName: 'column-header',
                        renderCell: (params) => {
                          const value = params.value;
                          return (
                            <div style={{ 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}>
                              {value}
                            </div>
                          );
                        }
                      }))
                    : Object.keys(uploadedData[0]).filter(key => key !== 'id').map((key) => ({
                        field: key,
                        headerName: key,
                        width: key.toLowerCase().includes('first name') || key.toLowerCase().includes('last name') ? 150 :
                               key.toLowerCase().includes('email') ? 200 : 
                               key.toLowerCase().includes('total') ? 100 : 120,
                        editable: true,
                        headerClassName: 'column-header',
                        renderCell: (params) => {
                          const value = params.value;
                          return (
                            <div style={{ 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}>
                              {value}
                            </div>
                          );
                        }
                      }))
                  }
                  pageSize={25}
                  rowsPerPageOptions={[25, 50, 100]}
                  checkboxSelection
                  disableSelectionOnClick
                  getRowId={(row) => row.id}
                  onRowSelectionModelChange={(newSelection) => {
                    setSelectedRows(newSelection);
                  }}
                  selectionModel={selectedRows}
                  onCellEditCommit={handleCellEdit}
                  components={{
                    Toolbar: GridToolbar,
                  }}
                  componentsProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
                  hideFooter={true}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-filler': {
                      display: 'none'
                    },
                    '& .MuiDataGrid-row': {
                      borderBottom: '1px solid rgba(224, 224, 224, 1)',
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    },
                    '& .column-header': {
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      whiteSpace: 'normal',
                      lineHeight: '1.3',
                      height: 'auto',
                      padding: '12px 8px',
                      minHeight: '70px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #f093fb',
                      wordWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      overflow: 'visible'
                    },
                    '& .MuiDataGrid-cell': {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.2',
                      padding: '8px',
                      height: 'auto',
                      minHeight: '52px',
                      display: 'flex',
                      alignItems: 'center'
                    },
                    '& .MuiDataGrid-row': {
                      minHeight: '52px !important',
                      maxHeight: 'none !important'
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      maxHeight: 'none !important',
                      minHeight: '70px !important',
                      backgroundColor: '#f8f9fa'
                    }
                  }}
                />
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Add Row Dialog */}
      <Dialog 
        open={openAddDialog} 
        onClose={() => setOpenAddDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2c3e50' }}>Add New Row</DialogTitle>
        <DialogContent>
          {generateFormFields(newRow)}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setOpenAddDialog(false)}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveNewRow} 
            variant="contained"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2c3e50' }}>Edit Row</DialogTitle>
        <DialogContent>
          {generateFormFields(editingRow, true)}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setOpenEditDialog(false)}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEditedRow} 
            variant="contained"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PreferencesPage;