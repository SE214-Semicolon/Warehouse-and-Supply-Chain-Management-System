#!/bin/bash
# filepath: backend/scripts/run-tests-by-type.sh
# Reworked script for GitHub Actions integration
# Usage:
#   ./run-tests-by-type.sh <type> [module]    Run tests for type (optionally for specific module)
#   ./run-tests-by-type.sh --list-modules     List all modules as JSON
#   ./run-tests-by-type.sh --list-types       List all test types as JSON
#   ./run-tests-by-type.sh --matrix           Output module × type matrix as JSON for GitHub Actions
#
# Test Structure:
#   - Module tests: src/modules/<module>/tests/{unit-test,integration-test,sanity-test}/
#   - Smoke tests:  src/tests/smoke/ (centralized, not per-module)

set -e

# Change to backend directory
cd "$(dirname "$0")/.."

# Centralized smoke test directory
SMOKE_TEST_DIR="src/tests/smoke"

# Discover all modules (handles both tests/ and test/ directories)
get_modules() {
  local modules=()
  for dir in src/modules/*/; do
    module=$(basename "$dir")
    # Check if module has tests/ or test/ directory
    if [ -d "src/modules/$module/tests" ] || [ -d "src/modules/$module/test" ]; then
      modules+=("$module")
    fi
  done
  echo "${modules[@]}"
}

# Get the test directory for a module (handles tests/ vs test/)
get_test_dir() {
  local module=$1
  if [ -d "src/modules/$module/tests" ]; then
    echo "src/modules/$module/tests"
  elif [ -d "src/modules/$module/test" ]; then
    echo "src/modules/$module/test"
  else
    echo ""
  fi
}

# Map test type to directory name (for module-level tests)
get_type_dir() {
  local type=$1
  case "$type" in
    unit) echo "unit-test" ;;
    sanity) echo "sanity-test" ;;
    e2e|integration) echo "integration-test" ;;
    smoke) echo "" ;; # Smoke tests are centralized, not per-module
    *) echo "" ;;
  esac
}

# Check if test type is centralized (not per-module)
is_centralized_test() {
  local type=$1
  case "$type" in
    smoke) return 0 ;;
    *) return 1 ;;
  esac
}

# Get centralized test directory for a type
get_centralized_test_dir() {
  local type=$1
  case "$type" in
    smoke) echo "$SMOKE_TEST_DIR" ;;
    *) echo "" ;;
  esac
}

# Get jest config for test type
get_jest_config() {
  local type=$1
  case "$type" in
    e2e|integration|smoke) echo "test/jest-e2e.json" ;;
    *) echo "jest.config.ts" ;;
  esac
}

# List modules as JSON array
list_modules_json() {
  local modules=($(get_modules))
  local json="["
  local first=true
  for module in "${modules[@]}"; do
    if [ "$first" = true ]; then
      first=false
    else
      json+=","
    fi
    json+="\"$module\""
  done
  json+="]"
  echo "$json"
}

# List test types as JSON array
list_types_json() {
  echo '["unit","sanity","integration","smoke"]'
}

# Generate matrix JSON for GitHub Actions
generate_matrix_json() {
  local modules=($(get_modules))
  local types=("unit" "sanity" "integration")
  local includes="["
  local first=true
  
  # Add module-level tests (unit, sanity, integration)
  for module in "${modules[@]}"; do
    local test_dir=$(get_test_dir "$module")
    if [ -z "$test_dir" ]; then
      continue
    fi
    
    for type in "${types[@]}"; do
      local type_dir=$(get_type_dir "$type")
      local full_path="$test_dir/$type_dir"
      
      # Only include if the test directory exists
      if [ -d "$full_path" ]; then
        if [ "$first" = true ]; then
          first=false
        else
          includes+=","
        fi
        includes+="{\"module\":\"$module\",\"type\":\"$type\"}"
      fi
    done
  done
  
  # Add centralized smoke tests (no module, just type)
  if [ -d "$SMOKE_TEST_DIR" ]; then
    if [ "$first" = true ]; then
      first=false
    else
      includes+=","
    fi
    includes+="{\"module\":\"_system\",\"type\":\"smoke\"}"
  fi
  
  includes+="]"
  echo "{\"include\":$includes}"
}

# Run tests for a specific module and type
# Usage: run_tests <type> [module] [-- extra jest args...]
run_tests() {
  local type=$1
  shift
  local module=""
  local jest_args=()
  
  # Parse remaining arguments: module name (optional) and extra jest args after --
  while [ $# -gt 0 ]; do
    case "$1" in
      --)
        shift
        jest_args=("$@")
        break
        ;;
      --*)
        # Jest argument, add to jest_args
        jest_args+=("$1")
        ;;
      *)
        # Module name (first non-option argument)
        if [ -z "$module" ]; then
          module="$1"
        else
          jest_args+=("$1")
        fi
        ;;
    esac
    shift
  done
  
  local jest_config=$(get_jest_config "$type")
  
  # Handle centralized tests (e.g., smoke)
  if is_centralized_test "$type"; then
    local centralized_dir=$(get_centralized_test_dir "$type")
    
    if [ -n "$module" ] && [ "$module" != "_system" ]; then
      echo "Warning: $type tests are centralized and not module-specific."
      echo "Running all $type tests instead..."
    fi
    
    if [ ! -d "$centralized_dir" ]; then
      echo "Warning: No $type tests found (path: $centralized_dir)"
      echo "Skipping..."
      exit 0
    fi
    
    echo "Running centralized $type tests..."
    echo "Test directory: $centralized_dir"
    echo "Jest args: ${jest_args[*]}"
    npx jest "$centralized_dir" --config "$jest_config" "${jest_args[@]}"
    return
  fi
  
  # Handle module-level tests (unit, sanity, integration)
  local type_dir=$(get_type_dir "$type")
  
  if [ -z "$type_dir" ]; then
    echo "Error: Unknown test type '$type'"
    echo "Valid types: unit, sanity, e2e, integration, smoke"
    exit 2
  fi
  
  if [ -n "$module" ]; then
    # Run tests for specific module
    local test_dir=$(get_test_dir "$module")
    if [ -z "$test_dir" ]; then
      echo "Error: Module '$module' not found or has no tests directory"
      exit 3
    fi
    
    local full_path="$test_dir/$type_dir"
    if [ ! -d "$full_path" ]; then
      echo "Warning: No $type tests found for module '$module' (path: $full_path)"
      echo "Skipping..."
      exit 0
    fi
    
    echo "Running $type tests for module: $module"
    echo "Jest args: ${jest_args[*]}"
    npx jest "$full_path" --config "$jest_config" "${jest_args[@]}"
  else
    # Run tests for all modules
    echo "Running $type tests for all modules..."
    
    # Collect all matching test directories
    local test_paths=()
    local modules=($(get_modules))
    
    for mod in "${modules[@]}"; do
      local test_dir=$(get_test_dir "$mod")
      if [ -n "$test_dir" ]; then
        local full_path="$test_dir/$type_dir"
        if [ -d "$full_path" ]; then
          test_paths+=("$full_path")
        fi
      fi
    done
    
    if [ ${#test_paths[@]} -eq 0 ]; then
      echo "No $type tests found in any module."
      exit 0
    fi
    
    echo "Found test directories: ${test_paths[*]}"
    echo "Jest args: ${jest_args[*]}"
    npx jest "${test_paths[@]}" --config "$jest_config" "${jest_args[@]}"
  fi
}

# Main logic
case "$1" in
  --list-modules)
    list_modules_json
    ;;
  --list-types)
    list_types_json
    ;;
  --matrix)
    generate_matrix_json
    ;;
  --help|-h|"")
    echo "Usage: $0 <type> [module] [-- jest-args...]"
    echo "       $0 --list-modules    List all modules as JSON"
    echo "       $0 --list-types      List all test types as JSON"
    echo "       $0 --matrix          Output matrix JSON for GitHub Actions"
    echo ""
    echo "Test types:"
    echo "  unit        - Unit tests (per-module: src/modules/<mod>/tests/unit-test/)"
    echo "  sanity      - Sanity tests (per-module: src/modules/<mod>/tests/sanity-test/)"
    echo "  integration - Integration tests (per-module: src/modules/<mod>/tests/integration-test/)"
    echo "  e2e         - Alias for integration"
    echo "  smoke       - Smoke tests (centralized: src/tests/smoke/)"
    echo ""
    echo "Examples:"
    echo "  $0 unit                   Run unit tests for all modules"
    echo "  $0 unit order             Run unit tests for order module only"
    echo "  $0 integration product    Run integration tests for product module"
    echo "  $0 smoke                  Run centralized smoke tests"
    echo "  $0 integration -- --testTimeout=120000   Pass extra args to Jest"
    echo "  $0 --matrix               Generate GitHub Actions matrix"
    exit 0
    ;;
  *)
    run_tests "$@"
    ;;
esac