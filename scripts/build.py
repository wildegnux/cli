import yaml
import os
import sys

def config_tree_list(tree, L):
	cur = tree
	while L:
		e = L.pop(0)
		if not e in cur:
			cur[e] = {} if L else []
		cur = cur[e]
	return cur

def has_id_in_list(L, id):
	for l in L:
		if l['id'] == id:
			return True
	return False

def load_hook(type, id, basedir):
	with open(basedir + '/src/hooks/' + ("/".join(type)) + '/' + id + '.hsl', 'r') as f:
		return f.read();

def populate_scripts(cfg, basedir):
	basedir += '/src/files/'
	for root, d_names, f_names in os.walk(basedir):
		idroot = root[len(basedir):]
		if idroot != "":
			idroot = idroot + "/"
		for file in f_names:
			with open(basedir + idroot + file) as f:
				node = config_tree_list(cfg, ['scripting', 'files'])
				node.append({'id': idroot + file, 'data': f.read()})

def main():
	basedir = sys.argv[1]

	smtpdapp = open(basedir + "/src/config/smtpd-app.yaml", 'r')
	cfg = yaml.load(smtpdapp)
	for server in cfg['servers']:
		if 'phases' in server:
			phases = server['phases']
			for p in ['connect', 'helo', 'auth', 'mailfrom']:
				if p in phases:
					if 'hook' in phases[p]:
						node = config_tree_list(cfg, ['scripting', 'hooks', p])
						if not has_id_in_list(node, phases[p]['hook']):
							node.append({'id': phases[p]['hook'], 'data': load_hook([p], phases[p]['hook'], basedir)})
			if 'rcptto' in server['phases']:
				if 'hook' in server['phases']['rcptto']:
					hook = server['phases']['rcptto']['hook']
					if isinstance(hook, str):
						node = config_tree_list(cfg, ['scripting', 'hooks', 'rcptto'])
						if not has_id_in_list(node, hook):
							node.append({'id': hook, 'data': load_hook(['rcptto'], hook, basedir)})
					else:
						if 'id' in hook:
							node = config_tree_list(cfg, ['scripting', 'hooks', 'rcptto'])
							if not has_id_in_list(node, hook['id']):
								node.append({'id': hook['id'], 'data': load_hook(['rcptto'], hook['id'], basedir)})
						if 'recipientdomains' in hook:
							for h in hook['recipientdomains'].values():
								node = config_tree_list(cfg, ['scripting', 'hooks', 'rcptto'])
								if not has_id_in_list(node, h):
									node.append({'id': h, 'data': load_hook(['rcptto'], h, basedir)})
			if 'eod' in server['phases']:
				eod = server['phases']['eod']
				if 'hook' in eod:
					node = config_tree_list(cfg, ['scripting', 'hooks', 'eod'])
					if not has_id_in_list(node, eod['hook']):
						node.append({'id': eod['hook'], 'data': load_hook(['eod'], eod['hook'], basedir)})
				if 'rcpt' in eod:
					hook = eod['rcpt']['hook']
					if isinstance(hook, str):
						node = config_tree_list(cfg, ['scripting', 'hooks', 'eodrcpt'])
						if not has_id_in_list(node, hook):
							node.append({'id': hook, 'data': load_hook(['eod', 'rcpt'], hook, basedir)})
					else:
						if 'id' in hook:
							node = config_tree_list(cfg, ['scripting', 'hooks', 'eodrcpt'])
							if not has_id_in_list(node, hook['id']):
								node.append({'id': hook['id'], 'data': load_hook(['eod', 'rcpt'], hook['id'], basedir)})
						if 'recipientdomains' in hook:
							for h in hook['recipientdomains'].values():
								node = config_tree_list(cfg, ['scripting', 'hooks', 'eodrcpt'])
								if not has_id_in_list(node, h):
									node.append({'id': h, 'data': load_hook(['eod', 'rcpt'], h, basedir)})
	populate_scripts(cfg, basedir)
	f = open(basedir + "/dist/smtpd-app.yaml", "w")
	f.write(yaml.dump(cfg, default_flow_style=False))

	queuedapp = open(basedir + "/src/config/queued-app.yaml", 'r')
	cfg = yaml.load(queuedapp)
	for hook in ['predelivery', 'postdelivery']:
		if os.path.exists(basedir + '/src/hooks/queue/' + hook + '.hsl'):
			if not 'scripting' in cfg:
				cfg['scripting'] = {}
			cur = cfg['scripting'];
			if not 'hooks' in cur:
				cur['hooks'] = {}
			cur['hooks'][hook] = load_hook(['queue'], hook, basedir);
	populate_scripts(cfg, basedir)
	f = open(basedir + "/dist/queued-app.yaml", "w")
	f.write(yaml.dump(cfg, default_flow_style=False))

if __name__ == "__main__":
    main()
