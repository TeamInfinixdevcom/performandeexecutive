import os
import re

# Ruta base del proyecto
BASE_DIR = os.path.join(os.path.dirname(__file__), '.')

# Archivos a revisar (solo index.js de functions por ahora)
FILES_TO_CHECK = [
    os.path.join(BASE_DIR, 'functions', 'index.js'),
]

# Patrones de triggers duplicados
TRIGGER_PATTERNS = [
    r'exports\.(onUserCreated|createUserDocument)\s*=\s*functions\.auth\.user\(\)\.onCreate',
    r'exports\.(onUserDeleted)\s*=\s*functions\.auth\.user\(\)\.onDelete',
]

def find_duplicate_triggers():
    for file_path in FILES_TO_CHECK:
        if not os.path.exists(file_path):
            print(f"Archivo no encontrado: {file_path}")
            continue
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        for pattern in TRIGGER_PATTERNS:
            matches = list(re.finditer(pattern, content))
            if len(matches) > 1:
                print(f"\n⚠️ Duplicados encontrados en {file_path} para patrón: {pattern}")
                for m in matches:
                    # Mostrar la línea y el contexto
                    start = content.rfind('\n', 0, m.start()) + 1
                    end = content.find('\n', m.end())
                    print('  Línea:', content[start:end].strip())
            elif len(matches) == 1:
                print(f"\n✔️ Solo un trigger encontrado en {file_path} para patrón: {pattern}")
            else:
                print(f"\n❌ Ningún trigger encontrado en {file_path} para patrón: {pattern}")

if __name__ == '__main__':
    find_duplicate_triggers()
