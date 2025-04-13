
// This is a modified version of the toast hook that ensures proper React hook usage
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const initialState: State = {
  toasts: [],
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

export function useToast() {
  const [state, dispatch] = React.useReducer(reducer, initialState)

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false) {
        const timeoutId = setTimeout(() => {
          dispatch({ type: "REMOVE_TOAST", toastId: toast.id })
        }, TOAST_REMOVE_DELAY)

        return () => clearTimeout(timeoutId)
      }
    })
  }, [state.toasts])

  const toast = React.useMemo(
    () => ({
      ...state,
      toast: (props: Omit<ToasterToast, "id">) => {
        const id = genId()
        const newToast = { ...props, id, open: true }
        
        dispatch({
          type: "ADD_TOAST",
          toast: {
            ...newToast,
            onOpenChange: (open: boolean) => {
              if (!open) {
                dispatch({ type: "DISMISS_TOAST", toastId: id })
              }
            },
          },
        })
        
        return {
          id,
          dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
          update: (props: ToasterToast) =>
            dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
        }
      },
      dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    }),
    [state]
  )

  return toast
}

export { type ToasterToast }
