// src/assets/Icons.jsx
// 使用 lucide-react 作為圖示庫 (安裝: npm install lucide-react)
// 這裡為了相容舊代碼，我們直接封裝 lucide 的元件
import { 
  FileText, Settings, LogOut, Plus, Trash2, Download, Save, User, Check, 
  ChevronRight, Edit, Layers, Eye, Link, Inbox, Sun, Moon, Star, X, Shield, 
  AlertCircle, Clock, Mail, Home, TrendingUp, List, Grid, Users, FileUp, 
  RefreshCw, ArrowUp, ArrowDown, Info, Layout, GripVertical 
} from 'lucide-react';

export const Icons = {
    FileText: (props) => <FileText {...props} />,
    Settings: (props) => <Settings {...props} />,
    LogOut: (props) => <LogOut {...props} />,
    Plus: (props) => <Plus {...props} />,
    Trash2: (props) => <Trash2 {...props} />,
    Download: (props) => <Download {...props} />,
    Save: (props) => <Save {...props} />,
    User: (props) => <User {...props} />,
    Check: (props) => <Check {...props} />,
    ChevronRight: (props) => <ChevronRight {...props} />,
    Edit: (props) => <Edit {...props} />,
    Layers: (props) => <Layers {...props} />,
    Eye: (props) => <Eye {...props} />,
    Link: (props) => <Link {...props} />,
    Inbox: (props) => <Inbox {...props} />,
    Sun: (props) => <Sun {...props} />,
    Moon: (props) => <Moon {...props} />,
    Star: (props) => <Star {...props} />,
    X: (props) => <X {...props} />,
    Shield: (props) => <Shield {...props} />,
    ArrowLeft: (props) => <ChevronRight className="rotate-180" {...props} />, // Lucide 沒有 ArrowLeft 對應舊版，用 Chevron 轉向
    AlertCircle: (props) => <AlertCircle {...props} />,
    Clock: (props) => <Clock {...props} />,
    Mail: (props) => <Mail {...props} />,
    Home: (props) => <Home {...props} />,
    TrendingUp: (props) => <TrendingUp {...props} />,
    List: (props) => <List {...props} />,
    Grid: (props) => <Grid {...props} />,
    UserGroup: (props) => <Users {...props} />,
    FileUp: (props) => <FileUp {...props} />,
    RefreshCw: (props) => <RefreshCw {...props} />,
    ArrowUp: (props) => <ArrowUp {...props} />,
    ArrowDown: (props) => <ArrowDown {...props} />,
    Info: (props) => <Info {...props} />,
    Success: (props) => <Check {...props} />, // 復用 Check
    Error: (props) => <AlertCircle {...props} />, // 復用 AlertCircle
    Layout: (props) => <Layout {...props} />,
    Drag: (props) => <GripVertical {...props} />
};