#!/bin/bash
# filepath: backend/scripts/run-tests-by-type.sh
# Reworked script for GitHub Actions integration
# Usage:
#   ./run-tests-by-type.sh <type> [module]    Run tests for type (optionally for specific module)
#   ./run-tests-by-type.sh --list-modules     List all modules as JSON
#   ./run-tests-by-type.sh --list-types       List all test types as JSON
#   ./run-tests-by-type.sh --matrix           Output module × type matrix as JSON for GitHub Actions

set -e

# Change to backend directory
cd "$(dirname "$0")/.."

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

# Map test type to directory name
get_type_dir() {
  local type=$1
  case "$type" in
    unit) echo "unit-test" ;;
    smoke) echo "smoke-test" ;;
    sanity) echo "sanity-test" ;;
    e2e|integration) echo "integration-test" ;;
    *) echo "" ;;
  esac
}

# Get jest config for test type
get_jest_config() {
  local type=$1
  case "$type" in
    e2e|integration) echo "test/jest-e2e.json" ;;
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
  echo '["unit","smoke","sanity","integration"]'
}

# Generate matrix JSON for GitHub Actions
generate_matrix_json() {
  local modules=($(get_modules))
  local types=("unit" "smoke" "sanity" "integration")
  local includes="["
  local first=true
  
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
  
  includes+="]"
  echo "{\"include\":$includes}"
}

# Run tests for a specific module and type
run_tests() {
  local type=$1
  local module=$2
  local type_dir=$(get_type_dir "$type")
  local jest_config=$(get_jest_config "$type")
  
  if [ -z "$type_dir" ]; then
    echo "Error: Unknown test type '$type'"
    echo "Valid types: unit, smoke, sanity, e2e, integration"
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
    npx jest "$full_path" --config "$jest_config"
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
    npx jest "${test_paths[@]}" --config "$jest_config"
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
    echo "Usage: $0 <type> [module]"
    echo "       $0 --list-modules    List all modules as JSON"
    echo "       $0 --list-types      List all test types as JSON"
    echo "       $0 --matrix          Output matrix JSON for GitHub Actions"
    echo ""
    echo "Test types: unit, smoke, sanity, e2e (or integration)"
    echo ""
    echo "Examples:"
    echo "  $0 unit                   Run unit tests for all modules"
    echo "  $0 unit order             Run unit tests for order module only"
    echo "  $0 integration product    Run integration tests for product module"
    echo "  $0 --matrix               Generate GitHub Actions matrix"
    exit 0
    ;;
  *)
    run_tests "$1" "$2"
    ;;
esac