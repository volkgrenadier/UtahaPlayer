import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#9d2f5c',
      light: '#c0527c',
      dark: '#7c2348',
      contrastText: '#fff7fb'
    },
    background: {
      default: '#f4eff4',
      paper: '#fffaff'
    },
    text: {
      primary: '#281f2b',
      secondary: '#685e6b'
    },
    divider: 'rgba(45, 31, 49, 0.13)',
    success: { main: '#416b56' },
    warning: { main: '#93601e' },
    error: { main: '#a33e32' },
    info: { main: '#49677c' }
  },
  typography: {
    fontFamily: '"Segoe UI Variable", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 650
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f4eff4',
          color: '#281f2b'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          border: '1px solid rgba(45, 31, 49, 0.13)',
          boxShadow: '0 18px 50px rgba(57, 35, 61, 0.14)'
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          border: '1px solid rgba(45, 31, 49, 0.13)',
          boxShadow: '0 18px 50px rgba(57, 35, 61, 0.14)'
        }
      }
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        enterDelay: 450
      }
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    }
  }
})

export default theme
