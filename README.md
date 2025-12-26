Please optimize the project for minimal bundle size and cleaner dependency graph,
WITHOUT changing any existing functionality, UI behavior, or application logic.

IMPORTANT CONSTRAINTS:

- Do NOT modify business logic.
- Do NOT change visual behavior or UX.
- Do NOT rewrite features or algorithms.
- Only remove unused, redundant, or unnecessary code and dependencies.
- Final app behavior must be 100% identical to current behavior.

Your task is purely optimization and cleanup.

---

## WHAT TO DO

1. Analyze the project structure and identify:

   - Unused npm dependencies in package.json
   - Libraries that are imported but not actually used
   - Dev dependencies that can be removed
   - Duplicate or redundant helper utilities
   - Dead code paths (unused functions, components, files)
   - Old experimental files not referenced anywhere
   - Unused assets (icons, images, fonts)

2. Optimize the build output:

   - Ensure tree-shaking works correctly
   - Remove unused exports
   - Convert broad imports (e.g. `import * as X`) into named imports where applicable
   - Remove unnecessary polyfills
   - Ensure only required CSS is bundled
   - Verify no unused global styles are included

3. Verify build configuration:

   - Check `vite.config.ts` (or equivalent) for unnecessary plugins
   - Remove plugins not used in the actual build
   - Ensure production build uses minification and compression
   - Confirm that source maps are disabled for production (unless required)

4. Dependency audit:

   - Identify libraries that can be replaced by native browser APIs
   - Remove polyfills that modern browsers no longer require
   - Remove duplicated libraries that do the same thing
   - Keep only one solution per concern (e.g. one date lib, one image lib)

5. Tree-shaking & bundle cleanup:

   - Ensure ES module syntax is used everywhere
   - Avoid default exports where named exports work better for tree-shaking
   - Remove side-effect imports
   - Mark sideEffects: false in package.json where safe

6. Build verification:
   - Run `npm run build`
   - Confirm no runtime or TypeScript errors
   - Ensure the app behaves exactly the same as before
   - Verify reduced bundle size (report before/after sizes)

---

## DELIVERABLES

After optimization, please provide:

1. A summary of what was removed or optimized:

   - Removed packages
   - Files deleted
   - Config changes

2. A brief before/after comparison:

   - Bundle size (before → after)
   - Number of dependencies reduced
   - Build time difference (if noticeable)

3. Confirmation that:
   - No UI or functional changes occurred
   - All features still work exactly the same

---

## IMPORTANT RULES

- DO NOT modify application logic or UI behavior.
- DO NOT refactor working code for style reasons.
- DO NOT change user-facing behavior.
- DO NOT remove features.
- ONLY optimize structure, dependencies, and build output.

If something is unclear or risky, stop and report before making changes.

Proceed carefully and conservatively.
