# Skill: NextJS Architect Guard - Knowledge Base

## Zasady kodowania:
1. **Data Fetching:** Używaj Server Components i `async/await` bezpośrednio w komponentach.
2. **Server Actions:** Wszystkie mutacje muszą być w folderze `src/app/actions` i używać `zod` do walidacji.
3. **Stylizacja:** Tylko Tailwind CSS. Unikaj inline styles. Używaj biblioteki `clsx` lub `tailwind-merge` do łączenia klas.
4. **Typowanie:** Nigdy nie używaj `any`. Definiuj interfejsy w folderze `@/types`.

## Workflow z MCP:
- Zanim zaproponujesz zmianę w strukturze plików, użyj `list_directory`, aby zobaczyć obecną architekturę.
- Po wygenerowaniu kodu, spróbuj uruchomić `npm run lint` (Terminal MCP), aby sprawdzić błędy.