import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4ade80' },
    secondary: { main: '#60a5fa' },
    background: { default: '#071012', paper: '#0b1720' },
    text: { primary: '#e6f7ea', secondary: '#9fb7a8' }
  },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif'
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#071b12',
          borderBottom: '1px solid rgba(255,255,255,0.03)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    }
  }
})

export default theme
