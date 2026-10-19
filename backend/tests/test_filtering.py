import os
import tempfile
from app.services.parsing_service import discover_files

def test_file_filtering_and_discovery():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create allowed file
        py_file = os.path.join(tmpdir, "main.py")
        with open(py_file, "w") as f:
            f.write("print('hello')")

        # Create ignored dir
        git_dir = os.path.join(tmpdir, ".git")
        os.makedirs(git_dir)
        with open(os.path.join(git_dir, "config"), "w") as f:
            f.write("git config")

        node_dir = os.path.join(tmpdir, "node_modules")
        os.makedirs(node_dir)
        with open(os.path.join(node_dir, "pkg.js"), "w") as f:
            f.write("console.log()")

        # Create ignored extension
        img_file = os.path.join(tmpdir, "banner.png")
        with open(img_file, "wb") as f:
            f.write(b"\x89PNG")

        discovered = discover_files(tmpdir)
        assert py_file in discovered
        assert not any(".git" in f for f in discovered)
        assert not any("node_modules" in f for f in discovered)
        assert not any(f.endswith(".png") for f in discovered)
