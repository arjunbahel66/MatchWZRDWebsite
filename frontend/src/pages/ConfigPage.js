import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Button, Grid, Box, Alert, CircularProgress, TextField, InputAdornment, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { DataGrid, GridToolbarContainer, GridToolbarFilterButton, GridToolbarExport, GridToolbarColumnsButton, GridToolbarDensitySelector } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

const ConfigPage = () => {
  // State
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCell, setEditCell] = useState({ id: null, field: null, value: null });
  const [editValue, setEditValue] = useState('');

  // Helper function to calculate totals (SINGLE SOURCE OF TRUTH)
  const calculateTotalsForData = useCallback((data) => {
    if (!data || data.length === 0) return [];

    const dataWithRowTotals = data.map(row => {
      let rowTotal = 0;
      Object.keys(row).forEach(key => {
        if (key !== 'id' && key !== 'rowTotal') {
          const value = parseFloat(row[key]);
          if (!isNaN(value)) rowTotal += value;
        }
      });
      return { ...row, rowTotal };
    });

    const columnKeys = columnOrder.length > 0 
      ? columnOrder 
      : Object.keys(data[0]).filter(key => key !== 'id');

    const columnTotals = {};
    columnKeys.forEach(key => {
      if (key.toLowerCase().includes('name') || key.toLowerCase().includes('email')) {
        columnTotals[key] = '';
      } else {
        const sum = data.reduce((acc, row) => {
          const value = parseFloat(row[key]);
          return acc + (isNaN(value) ? 0 : value);
        }, 0);
        columnTotals[key] = sum;
      }
    });

    const grandTotal = Object.values(columnTotals).reduce((acc, val) => 
      typeof val === 'number' ? acc + val : acc, 0);
    columnTotals.rowTotal = grandTotal;

    const totalRowData = { id: 'total-row', ...columnTotals };
    return [...dataWithRowTotals, totalRowData];
  }, [columnOrder]);

  // Filtered data with search
  const processedData = useMemo(() => {
    if (!uploadedData) return [];
    
    let data = uploadedData;
    if (searchText) {
      data = uploadedData.filter(row => {
        return Object.values(row).some(value => 
          value !== null && 
          value !== undefined && 
          String(value).toLowerCase().includes(searchText.toLowerCase())
        );
      });
    }
    
    return calculateTotalsForData(data);
  }, [uploadedData, searchText, calculateTotalsForData]);

  // Search handlers
  const handleSearch = (event) => setSearchText(event.target.value);
  const handleClearSearch = () => setSearchText('');

  // Delete rows
  const handleDeleteRows = () => {
    if (selectedRows.length === 0) return;
    const updatedData = uploadedData.filter(row => !selectedRows.includes(row.id));
    setUploadedData(updatedData);
    setSelectedRows([]);
    setUploadStatus({
      type: 'success',
      message: `${selectedRows.length} row(s) deleted successfully.`
    });
  };

  // Add row
  const handleAddRow = () => {
    if (!uploadedData || uploadedData.length === 0) return;
    
    const firstRow = uploadedData[0];
    const newRowData = {};
    
    Object.keys(firstRow).forEach(key => {
      if (key === 'id') {
        const maxId = Math.max(...uploadedData.map(row => row.id));
        newRowData[key] = maxId + 1;
      } else {
        newRowData[key] = '';
      }
    });
    
    setUploadedData([...uploadedData, newRowData]);
    setUploadStatus({
      type: 'success',
      message: 'New row added successfully.'
    });
  };

  // Cell edit
  const handleCellEdit = (params) => {
    const { id, field, value } = params;
    const rowIndex = uploadedData.findIndex(row => row.id === id);
    if (rowIndex === -1) return;
    
    const updatedData = [...uploadedData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    
    setUploadedData(updatedData);
    setUploadStatus({
      type: 'success',
      message: 'Cell updated successfully.'
    });
  };

  // Edit dialog handlers
  const handleOpenEditDialog = (id, field, value) => {
    setEditCell({ id, field, value });
    setEditValue(value);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => setEditDialogOpen(false);

  const handleSaveEdit = () => {
    if (editCell.id && editCell.field) {
      handleCellEdit({
        id: editCell.id,
        field: editCell.field,
        value: editValue
      });
      setEditDialogOpen(false);
    }
  };

  // Columns definition
  const columns = useMemo(() => {
    if (!uploadedData || uploadedData.length === 0) return [];
    
    const columnKeys = columnOrder.length > 0 
      ? columnOrder 
      : Object.keys(uploadedData[0]).filter(key => key !== 'id');
    
    const regularColumns = columnKeys.map((key) => ({
      field: key,
      headerName: key,
      width: key.toLowerCase().includes('school name') ? 250 : 
             key.toLowerCase().includes('email') ? 200 : 
             key.toLowerCase().includes('capacity') ? 160 : 180,
      editable: false,
      headerClassName: 'column-header',
      renderCell: (params) => {
        const value = params.value;
        const isCapacityCell = key.toLowerCase().includes('capacity');
        const isSchoolNameCell = key === 'School Name';
        const isTotalRow = params.id === 'total-row';
        
        if ((isCapacityCell || isSchoolNameCell) && !isTotalRow) {
          return (
            <Box
              sx={{ 
                whiteSpace: 'normal', 
                lineHeight: '1.2',
                padding: '8px',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.08)',
                  '& .edit-icon': {
                    opacity: 1
                  }
                }
              }}
              onClick={() => handleOpenEditDialog(params.id, key, value)}
            >
              {value}
              <EditIcon 
                className="edit-icon"
                sx={{ 
                  position: 'absolute', 
                  right: '8px', 
                  fontSize: '16px',
                  opacity: 0,
                  color: '#667eea',
                  transition: 'opacity 0.2s ease'
                }} 
              />
            </Box>
          );
        }
        
        return (
          <div style={{ 
            whiteSpace: 'normal', 
            lineHeight: '1.2',
            padding: '8px',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}>
            {value}
          </div>
        );
      }
    }));
    
    return [
      ...regularColumns,
      {
        field: 'rowTotal',
        headerName: 'Row Total',
        width: 150,
        editable: false,
        headerClassName: 'column-header total-column',
        renderCell: (params) => {
          const isTotalRow = params.id === 'total-row';
          return (
            <div style={{ 
              whiteSpace: 'normal', 
              lineHeight: '1.2',
              padding: '8px',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {params.value}
            </div>
          );
        }
      }
    ];
  }, [uploadedData, columnOrder]);

  // File upload
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setIsLoading(true);
      setUploadStatus({
        type: 'info',
        message: `Processing file "${selectedFile.name}"...`
      });

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const response = await axios.post('/api/config/import', formData);

        if (response.data.success) {
          if (response.data.columnOrder && response.data.columnOrder.length > 0) {
            setColumnOrder(response.data.columnOrder);
          }
          
          setUploadedData(response.data.data);
          setUploadStatus({
            type: 'success',
            message: 'File processed successfully! Review the data below.'
          });
        } else {
          throw new Error(response.data.error || 'Processing failed');
        }
      } catch (error) {
        setUploadStatus({
          type: 'error',
          message: error.message
        });
      } finally {
        setIsLoading(false);
      }
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

  // Database operations
  const loadDataFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/config/load');
      
      if (response.data.success) {
        if (response.data.data.length > 0) {
          setUploadedData(response.data.data);
          setColumnOrder(response.data.columnOrder);
          setUploadStatus({
            type: 'success',
            message: 'Data loaded from database successfully.'
          });
        } else {
          setUploadStatus({
            type: 'info',
            message: 'No data found in database. Please upload a configuration file.'
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

  const saveDataToDatabase = async () => {
    try {
      setIsLoading(true);
      const dataToSave = uploadedData.filter(row => row.id !== 'total-row');
      const response = await axios.post('/api/config/save', { data: dataToSave });
      
      if (response.data.success) {
        setUploadStatus({
          type: 'success',
          message: response.data.message || 'Configuration saved successfully.'
        });
        loadDataFromDatabase();
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to save configuration.'
        });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setUploadStatus({
        type: 'error',
        message: 'Error saving configuration.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearDataFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/config/clear');
      
      if (response.data.success) {
        setUploadedData(null);
        setColumnOrder([]);
        setUploadStatus({
          type: 'success',
          message: response.data.message || 'Configuration data cleared successfully.'
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to clear configuration data.'
        });
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      setUploadStatus({
        type: 'error',
        message: 'Error clearing configuration data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDataFromDatabase();
  }, []);

  // Custom toolbar
  const CustomToolbar = () => (
    <GridToolbarContainer>
      <GridToolbarFilterButton />
      <GridToolbarExport />
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <Box sx={{ flexGrow: 1 }} />
      <Button
        color="primary"
        onClick={saveDataToDatabase}
        startIcon={<SaveIcon />}
        disabled={!uploadedData || uploadedData.length === 0}
      >
        Save to Database
      </Button>
    </GridToolbarContainer>
  );

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
            Configuration Management
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
            Upload and manage school configuration data. Each school has 6 breakout sessions with specific capacities.
            Edit data directly in the table and save your changes to the database.
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box 
              {...getRootProps()} 
              sx={{
                border: isDragActive ? '3px dashed #667eea' : '2px dashed #e0e0e0',
                borderRadius: '16px',
                p: 4,
                textAlign: 'center',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                bgcolor: isDragActive ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: isLoading ? 'transparent' : 'rgba(102, 126, 234, 0.04)',
                  borderColor: '#667eea',
                  transform: isLoading ? 'none' : 'translateY(-2px)',
                  boxShadow: isLoading ? 'none' : '0 8px 24px rgba(0,0,0,0.08)'
                }
              }}
            >
              <input {...getInputProps()} disabled={isLoading} />
              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={40} thickness={4} sx={{ color: '#667eea' }} />
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
                      background: 'linear-gradient(135deg, #667eea22 0%, #764ba211 100%)',
                      mb: 2
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 40, color: '#667eea' }} />
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 600 }}>
                    {isDragActive ? 'Drop the file here' : 'Upload Configuration File'}
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
                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
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
                          <SearchIcon sx={{ color: '#667eea' }} />
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
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
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
                        borderColor: '#667eea',
                        color: '#667eea',
                        '&:hover': {
                          borderColor: '#667eea',
                          backgroundColor: 'rgba(102, 126, 234, 0.08)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                  <Tooltip title="Save configuration to database">
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
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6a4092 100%)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)'
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
                  rows={processedData || []}
                  columns={columns}
                  pageSize={25}
                  rowsPerPageOptions={[25, 50, 100, 200]}
                  checkboxSelection
                  disableSelectionOnClick={true}
                  getRowId={(row) => row.id}
                  onRowSelectionModelChange={(newSelection) => {
                    setSelectedRows(newSelection);
                  }}
                  components={{
                    Toolbar: CustomToolbar,
                  }}
                  componentsProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
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
                      borderBottom: '2px solid #667eea',
                      wordWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      overflow: 'visible'
                    },
                    '& .column-header.total-column': {
                      backgroundColor: 'rgba(102, 126, 234, 0.12)',
                      fontWeight: 700,
                      borderLeft: '2px solid #667eea',
                      borderBottom: '2px solid #667eea'
                    },
                    '& .MuiDataGrid-cell': {
                      whiteSpace: 'normal',
                      lineHeight: '1.2',
                      padding: '8px',
                      overflow: 'visible',
                      height: 'auto',
                      minHeight: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)'
                      }
                    },
                    '& .MuiDataGrid-row': {
                      minHeight: '52px !important',
                      maxHeight: 'none !important'
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      maxHeight: 'none !important',
                      minHeight: '70px !important',
                      backgroundColor: '#f8f9fa'
                    },
                    '& .MuiDataGrid-cell:focus': {
                      outline: '2px solid #1976d2',
                      outlineOffset: '-2px'
                    },
                    '& .MuiDataGrid-row[data-id="total-row"]': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)'
                      }
                    },
                    '& .MuiDataGrid-cell[data-field="rowTotal"]': {
                      backgroundColor: 'rgba(25, 118, 210, 0.04)',
                      borderLeft: '2px solid #1976d2',
                      fontWeight: 'bold'
                    },
                  }}
                  autoHeight={false}
                  disableRowSelectionOnClick
                />
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Edit Cell Value
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={editCell.field}
            type="text"
            fullWidth
            variant="outlined"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleCloseEditDialog}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a4092 100%)',
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

export default ConfigPage;
