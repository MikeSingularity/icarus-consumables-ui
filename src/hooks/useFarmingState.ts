import { useCallback, useEffect, useRef, useState } from 'react'
import {
  parseFarmingParamsFromUrl,
  validateFarmingParams,
  type FarmingValidationContext,
} from '@/utils/urlState'

/**
 * State for the farming calculator user-configurable inputs.
 *
 * - servingsOverrides: items/hour for loadout items without a timed modifier
 * - recipeOverrides: chosen recipe ID per loadout item (for items with multiple recipes)
 * - genericSelections: chosen specific item per generic ingredient tag
 * - derivedRecipeOverrides: chosen recipe ID per ingredient name (one dropdown per ingredient)
 *
 * When validationContext is provided (data ready), restores r, g, d, s from the URL
 * once and merges validated entries into state.
 */
interface FarmingState {
  servingsOverrides: Record<string, number>
  recipeOverrides: Record<string, string>
  genericSelections: Record<string, string>
  derivedRecipeOverrides: Record<string, string>
}

export function useFarmingState(validationContext: FarmingValidationContext | null = null): {
  servingsOverrides: Record<string, number>
  recipeOverrides: Record<string, string>
  genericSelections: Record<string, string>
  derivedRecipeOverrides: Record<string, string>
  setServingsOverride: (itemName: string, value: number) => void
  setRecipeOverride: (itemName: string, recipeId: string) => void
  setGenericSelection: (genericId: string, itemName: string) => void
  setDerivedRecipeOverride: (ingredientName: string, recipeId: string) => void
  resetFarmingState: () => void
} {
  const [state, setState] = useState<FarmingState>({
    servingsOverrides: {},
    recipeOverrides: {},
    genericSelections: {},
    derivedRecipeOverrides: {},
  })

  const hasRestoredFromUrl = useRef(false)
  useEffect(() => {
    if (validationContext === null || hasRestoredFromUrl.current) return
    hasRestoredFromUrl.current = true
    const parsed = parseFarmingParamsFromUrl()
    const validated = validateFarmingParams(parsed, validationContext)
    const hasAny =
      Object.keys(validated.recipeOverrides).length > 0 ||
      Object.keys(validated.genericSelections).length > 0 ||
      Object.keys(validated.derivedRecipeOverrides).length > 0 ||
      Object.keys(validated.servingsOverrides).length > 0
    if (!hasAny) return
    queueMicrotask(() => {
      setState((prev) => ({
        ...prev,
        recipeOverrides: { ...prev.recipeOverrides, ...validated.recipeOverrides },
        genericSelections: { ...prev.genericSelections, ...validated.genericSelections },
        derivedRecipeOverrides: {
          ...prev.derivedRecipeOverrides,
          ...validated.derivedRecipeOverrides,
        },
        servingsOverrides: { ...prev.servingsOverrides, ...validated.servingsOverrides },
      }))
    })
  }, [validationContext])

  const setServingsOverride = useCallback((itemName: string, value: number) => {
    setState((prev) => ({
      ...prev,
      servingsOverrides: { ...prev.servingsOverrides, [itemName]: Math.max(0.1, value) },
    }))
  }, [])

  const setRecipeOverride = useCallback((itemName: string, recipeId: string) => {
    setState((prev) => ({
      ...prev,
      recipeOverrides: { ...prev.recipeOverrides, [itemName]: recipeId },
    }))
  }, [])

  const setGenericSelection = useCallback((genericId: string, itemName: string) => {
    setState((prev) => ({
      ...prev,
      genericSelections: { ...prev.genericSelections, [genericId]: itemName },
    }))
  }, [])

  const setDerivedRecipeOverride = useCallback((ingredientName: string, recipeId: string) => {
    setState((prev) => ({
      ...prev,
      derivedRecipeOverrides: { ...prev.derivedRecipeOverrides, [ingredientName]: recipeId },
    }))
  }, [])

  const resetFarmingState = useCallback(() => {
    setState({
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: {},
      derivedRecipeOverrides: {},
    })
  }, [])

  return {
    servingsOverrides: state.servingsOverrides,
    recipeOverrides: state.recipeOverrides,
    genericSelections: state.genericSelections,
    derivedRecipeOverrides: state.derivedRecipeOverrides,
    setServingsOverride,
    setRecipeOverride,
    setGenericSelection,
    setDerivedRecipeOverride,
    resetFarmingState,
  }
}
