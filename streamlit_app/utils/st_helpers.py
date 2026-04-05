import streamlit as st


def safe_rerun():
    """Try to programmatically rerun the Streamlit script.

    Handles environments where `st.experimental_rerun` may not exist by
    attempting to raise the framework's RerunException. Falls back to
    `st.stop()` with a UI hint if neither approach is available.
    """
    # Preferred API
    if hasattr(st, "experimental_rerun"):
        try:
            return st.experimental_rerun()
        except Exception:
            pass

    # Try raising known RerunException locations (different Streamlit versions)
    for path in (
        "streamlit.runtime.scriptrunner.RerunException",
        "streamlit.ScriptRunner.RerunException",
        "streamlit.runtime.scriptrunner.script_run_context.RerunException",
    ):
        try:
            module_path, cls_name = path.rsplit(".", 1)
            mod = __import__(module_path, fromlist=[cls_name])
            exc_cls = getattr(mod, cls_name)
            raise exc_cls()
        except Exception:
            # try next
            continue

    # Last-resort: stop execution and ask user to refresh
    st.warning("Please refresh the page to see the latest updates.")
    st.stop()
